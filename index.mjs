import express from 'express';
import path from "path";
import Componentry from '@metric-im/componentry';
import FireMacro from '../firemacro/index.mjs';

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
        for (let attr of ['search','render','target']) {
          if (typeof entry[attr] === 'function') entry[attr] = entry[attr](doc)
        }
        let fm = new FireMacro(entry);
        let populatedEntry = await fm.parse({truncate:Search.truncate.bind(this)},doc);
        let searchNumber = 0;
        for (let searchValue of populatedEntry.search) {
          writes.push({updateOne:{
            filter:{_id:`${entry.collection}${searchNumber++}_${doc._id}`},
            upsert:true,
            update:{$set:{
              collection:entry.collection,
              text:searchValue,
              render:populatedEntry.render,
              target:populatedEntry.target,
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
  async query(text,element) {
    let result = await this.searchable.find({$text:{$search:text}}).toArray();
    if (element) {
      element.append(result)
    } else {
      return result;
    }
  }
  static truncate(str,size= 200) {
    if (str && str.length>(size+50)) {
      str = str.slice(0,size);
      str = str.slice(0,str.lastIndexOf(' '))+'...'
    }
    return str;
  }
}
