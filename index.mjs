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
    for (let entry of this.manifest) {
      let data = await this.connector.db.collection(entry.collection).find(entry.where).toArray();
      let writes = [];
      for (const doc of data) {
        let record = Object.assign({},entry);
        // Sometimes _id can be an object. The manifest will define identifier if needed
        if (!record.identifier) record.identifier = doc._id;
        for (let attr of ['identifier','search','render','target']) {
          if (typeof record[attr] === 'function') record[attr] = record[attr](doc)
          else record[attr] = await new FireMacro(record[attr]).parse(doc);
        }
        let searchNumber = 0;
        for (let searchValue of record.search) {
          if (!searchValue) continue;
          writes.push({updateOne:{
            filter:{_id:`${record.collection}${searchNumber++}_${record.identifier}`},
            upsert:true,
            update:{$set:{
              collection:record.collection,
              text:searchValue,
              render:record.render,
              target:record.target,
              _created:new Date(doc._created || doc.createdAt),
              _modified:new Date(doc._modified || doc.updatedAt),
              _captured:new Date()
            }}
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
  async query(text,max=50) {
    let result = await this.searchable.find({$text:{$search:text}}).limit(max).toArray();
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
}
