# Search

Provide natural language search across all identified collections. Search collects
values from a given set of collections and fields, renders results and navigates to
the matching object

##
```shell
npm install @metric-im/search
```
```javascript
import Search from "@metric-im/search"

const search = new Search({db:mongo.db()})
await search.register([{collection:'myCollection',fields:['name','text']}]);

// registry with metric componentry to add route handling
const app = express();
const componentry = new Componentry(app, {db:mongoDb});
```

## Usage

```javascript
    {collection: 'users',fields:['username','firstName','lastName','bio'],
        render: '<h2>{username} ({firstName} {lastName})</h2><p>{bio}</p>',
        target: '/users/{_id}'},
```
