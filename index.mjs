import express from 'express';
import path from "path";
import Componentry from '@metric-im/componentry'

export default class Search extends Componentry.Module {
  constructor(connector,options) {
    super(connector,import.meta.url);
    this.connector = connector;
    this.db = this.connector.db;
    this.manifest = {};
    // search collection can be renamed by host
    this.collection = "_search";
  }
  async register(manifest = []) {
    this.searchable = this.connector.db.collection(this.collection);
    this.manifest = manifest;
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
}
