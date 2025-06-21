# Search

Provide literal and natural language search across all identified collections. Search collects
values from a given set of collections and fields, renders results and navigates to
the matching object

## Configuration
```shell
npm install @metric-im/search
```
```javascript
import Search from "@metric-im/search"

const search = new Search({db:mongo.db()})
await search.register([{
    search: (doc)=>{
        return [(doc.body)];
    },
    render: (doc,search) =>{
        return `<h2>${odc._id}</h2><p>${doc.body}</p><br>${moment(doc._modified).format('MMM-D,YYYY')}`;
    },
    target: '/{_id}'}
}]);
await results = await search.query('hello search text');
// results objects will populate "render" with the registered render() function
document.append(results[0].render);
```
The manifest passed to register() expects an array of objects denoting collections,
methods and options to be searched. Results include sorted objects that match the query.

### Database
Mongo language searches require a text index and text search. Search is executed with $text and $regex
```shell
db.searchable.createIndex({text:"text"})
db.searchable.find({$text:{$search:"pasta"}})
```
You can change the collection name with `search.setCollection(name)`.

## Usage
Each registered entry is executed to populate the searchable collection.

This entry uses FireMacro
```javascript
{collection: 'users',where:{username:{$ne:null}},
    search:['{username}','{firstName} {lastName}','{bio}'],
    render: '<h2>{username} ({firstName} {lastName})</h2><p>{bio}</p>',
    target: '/users/{_id}'},
```
This entry uses functions and a few helper functions
```javascript
{
    collection:'wiki',
    identifier: '{_id.d}',
    search: (doc)=>{
        return [Search.stripMarkdown(doc.body)];
        },
    attributes:{"docId":"_id.d"},
    render: (doc,search) =>{
        let parts = doc.text.match(/^#+ (.+?)\n(.*)/s) || [];
        let title = parts[1] || doc.docId;
        let synopsis = Search.focus(Search.stripMarkdown(doc.text),search);
        return `<h2><span class="icon icon-text-document"></span> ${title}</h2><p>${synopsis}</p><br>${moment(doc._modified).format('MMM-D,YYYY')}`;
    },
    target: '/#Wiki/{_id.d}'
}
```
The manifest entries are consulted when loading and querying. 

| attribute  | use   | default      | description                                                                                                              |
|------------|-------|--------------|--------------------------------------------------------------------------------------------------------------------------|
| search     | load  | n/a          | given a collection record, return an array of searchable strings                                                         |
| render     | query | focused text | given a result record, return formatted result text                                                                      |
| target     | load  | n/a          | the link to follow to render the discovered the record                                                                   |
| attributes | query | {}           | attributes to pull from the source into the searchable record {resultAttrName: sourceAttrName}. Dot notation can be used |
| identifier | query | _id          | if _id is an object, provide a the string value to identify this result uniquely in the collection                       |
