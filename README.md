# Search

Provide natural language search across all identified collections. Search collects
values from a given set of collections and fields, renders results and navigates to
the matching object

## Configuration
```shell
npm install @metric-im/search
```
```javascript
import Search from "@metric-im/search"

const search = new Search({db:mongo.db()})
await search.register([{collection:'myCollection',fields:['name','text']}]);
await results = await search.find('hello search text');
// results delivered as JSON can be formatted as a div
let html = search.format(results);
// results formatted as a div can be attached to the document.
document.append(html);
```
The manifest passed to register() expects an array of objects denoting collections,
fields and options to be searched. Results include sorted objects that match the query.
### Database
Mongo language searches require a text index and text search
```shell
db.searchable.createIndex({text:"text"})
db.searchable.find({$text:{$search:"pasta"}})
```
You can change the collection name with `search.setCollection(name)`.

## Usage

```javascript
{collection: 'users',where:{username:{$ne:null}},
    search:['{username}','{firstName} {lastName}','{bio}'],
    render: '<h2>{username} ({firstName} {lastName})</h2><p>{bio}</p>',
    target: '/users/{_id}'},
```
