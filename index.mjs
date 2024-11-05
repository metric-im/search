import express from 'express';
import path from "path";
import Componentry from '@metric-im/componentry'

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
  }
  async load() {
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
