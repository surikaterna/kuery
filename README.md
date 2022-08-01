# kuery

Simple Mongo-like queries with lo-dash, at the moment the operators are very limited...

### JavaScript
```javascript
var collection =  [
	{id:1, name:'Andreas',address:{street:'Bellmansgatan'}},
	{id:2, name:'Sven'},
	{id:3, name:'Christian'},
	{id:4, name:'Emil'},
];

		var q = new Kuery({id:{$in:[1,2]}});
		q.find(collection).length.should.equal(2);
		
		var q = new Kuery({"address.street":"Bellmansgatan"});
		q.find(collection).length.should.equal(1);
```

### TypeScript
```ts
import Kuery from 'Kuery';

const collection = [
	{id:1, name:'Andreas',address:{street:'Bellmansgatan'}},
	{id:2, name:'Sven'},
	{id:3, name:'Christian'},
	{id:4, name:'Emil'},
];

let q = new Kuery({id:{$in:[1,2]}});
expect(q.find(collection).length).toEqual(2);

let q = new Kuery({"address.street":"Bellmansgatan"});
expect(q.find(collection).length).toEqual(1);
```