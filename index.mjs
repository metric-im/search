import express from 'express';
import path from "path";
import Componentry from '@metric-im/componentry';
import FireMacro from '@metric-im/firemacro';
import removeMarkdown from 'remove-markdown';

export default class Search extends Componentry.Module {
  constructor(connector,options) {
    super(connector,import.meta.url);
    this.connector = connector;
    this.manifest = {};
    this.setCollection('searchable');
  }

  /**
   * Searchable collection can be configured by the host
   * @param name
   */
  setCollection(name) {
    this.searchable = this.connector.db.collection(name);
  }
  register(manifest = []) {
    this.manifest = (Array.isArray(manifest))?manifest:[manifest];
  }

  /**
   * Load the searchable collection according to the fields identified
   * in the manifest. Listeners will be set on each collection for real
   * time updates. Invoke load() regularly to ensure searchable data is
   * current.
   *
   * Load() uses Firemacro to merge the search and render templates with
   * collection data
   */
  async load() {
    for (let manifestIndex = 0; manifestIndex < this.manifest.length; manifestIndex++) {
      let entry = this.manifest[manifestIndex];
      let data = await this.connector.db.collection(entry.collection).find(entry.where).toArray();
      let writes = [];
      for (const doc of data) {
        let record = Object.assign({},entry);
        // Sometimes _id can be an object. The manifest will define identifier if needed
        if (!record.identifier) record.identifier = doc._id;
        for (let attr of ['identifier','search','target']) {
          if (typeof record[attr] === 'function') record[attr] = record[attr](doc)
          else record[attr] = await new FireMacro(record[attr]).parse(doc);
        }
        let searchNumber = 0;
        for (let searchValue of record.search) {
          if (!searchValue) continue;
          let values = {
            collection:record.collection,
            text:searchValue,
            target:record.target,
            _manifestIndex:manifestIndex,
            _created:new Date(doc._created || doc.createdAt),
            _modified:new Date(doc._modified || doc.updatedAt),
            _captured:new Date()
          }
          for (let attr of Object.entries(entry.attributes||{})) {
            values[attr[0]] = attr[1].split('.').reduce((o,i)=> o[i], doc);
          }
          writes.push({updateOne:{
            filter:{_id:`${record.collection}${searchNumber++}_${record.identifier}`},
            upsert:true,
            update:{$set:values}
          }});
        }
        if (writes.length >= 100) {
          await this.searchable.bulkWrite(writes);
          writes.length = 0;
        }
      }
      if (writes.length > 0) await this.searchable.bulkWrite(writes);
    }
  }
  async query(text,options={}) {
    options.max = options.max || 50;
    let query = [];
    query.push({$match:{$text:{$search:text}}});
    if (options.$match) query.push({$match:options.$match});
    query.push({$set:{score:{$meta:"textScore"}}});
    query.push({$unionWith:{coll:'searchable',pipeline:[
      {$match:{text:{$regex:text,$options:"i"}}},
      {$set:{score:text.length/5}},
      {$sort:{_modified:1}},
      {$limit:options.max}
    ]}});
    query.push({$group:{_id:"$_id",score:{$max:"$score"},_modified:{$max:"$_modified"},doc:{$last:"$$ROOT"}}});
    query.push({$sort:{score:1,_modified:1}});
    query.push({$replaceRoot:{newRoot:"$doc"}});
    query.push({$limit:options.max});
    let result = await this.searchable.aggregate(query).toArray();
    for (let entry of result) {
      try {
        entry.render = this.manifest[entry._manifestIndex].render(entry,text);
      } catch(e) {
        entry.render = `<h2>${entry.target}</h2><p>${Search.focus(entry.text,text)}</p>`
      }
    }
    return result;
  }
  static truncate(str,size= 200) {
    if (!str) return ""; // catch null or undefined
    if (str && str.length>(size+50)) {
      str = str.slice(0,size);
      str = str.slice(0,str.lastIndexOf(' '))+'...'
    }
    return str;
  }
  static stripHtml(str) {
    if (!str) return ""; // catch null or undefined
    //TODO: weak, this can be done more thoroughly
    return str.replace(/(<([^>]+)>)/gi, '')
  }
  static stripMarkdown(str) {
    if (!str) return ""; // catch null or undefined
    return removeMarkdown(str);
  }
  static focus(str,search,size=200) {
    let match = new RegExp(search,"i").exec(str)
    while(!match && search.length > 0) {
      search = search.slice(0,-1)
      match = new RegExp(search,"i").exec(str)
    }
    let startIndex = (match && match.index > 24)?match.index-24:0;
    while (startIndex > 0) {
      if ([' ','\t','\n'].includes(str[startIndex])) break;
      else startIndex--;
    }
    return Search.truncate(str.slice(startIndex),size);
  }
}
