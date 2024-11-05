import express from 'express';
import path from "path";
import Componentry from '@metric-im/componentry';
import FireMacro from '../wiki-mixin/components/FireMacro.mjs';

export default class Search extends Componentry.Module {
  constructor(connector,options) {
    super(connector,import.meta.url);
    this.connector = connector;
    this.db = this.connector.db;
    this.manifest = {};
    this.setCollection('_search');
  }

  /**
   * Searchable collection can be configured by the host
   * @param name
   */
  setCollection(name) {
    this.searchable = this.connector.db.collection(name);
  }
  async register(manifest = []) {
    this.manifest = (Array.isArray(manifest))?manifest:[manifest];
    await this.load();
  }

  /**
   * Load the searchable collection according to the fields identified
   * in the manifest. Listeners will be set on each collection for real
   * time updates. Invoke load() regularly to ensure searchable data is
   * current.
   */
  async load() {
    //TODO: change to update rather than erase for continuity and efficiency
    await this.collection.remove({});
    let result = [];
    for (let source of this.sources) {
      let record = {
        _id:Componentry.IdForge.datedId(),
        collection:source.collection
      }
      for (let field of source.fields) {
        result.push(Object.assign({},record,{
          name:field
        }))
      }
    }
  }
  async query(text) {
    for (let entry of this.manifest) {

    }
  }
}
