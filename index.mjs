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
      //TODO: change to update rather than erase for continuity and efficiency
      await this.searchable.deleteMany({collection:entry.collection});
      let data = await this.connector.db.collection(entry.collection).find(entry.where).toArray();
      let writes = [];
      let i = 0;
      for (const doc of data) {
        if (i++ > 200) break; //TODO: debug for quick results
        let fm = new FireMacro(entry);
        let populatedEntry = await fm.parse(doc);
        for (let searchValue of populatedEntry.search) {
          writes.push({insertOne:{
            _id:Componentry.IdForge.datedId(),
            collection:entry.collection,
            text:searchValue,
            render:populatedEntry.render,
            target:populatedEntry.target,
            created:doc.createdAt||doc.created,
            modified:doc.updatedAt||doc.modified
          }});
        }
      }
      await this.searchable.bulkWrite(writes);
      console.log('do bulk update')
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
}
