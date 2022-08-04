# Kuery

* [Purpose](#prupose)
* [Installation](#installation)
* [Usage](#usage)
* [Methods](#methods)
  * [Constructor](#kuerytoptions-kueryoptions)
  * [skip](#skipskip-kueryoptionsskipkueryoptions)
  * [limit](#limitlimit-kueryoptionsskipkueryoptions)
  * [sort](#sortsort-kueryoptionssortkueryoptions)
  * [find](#findcollection-arraycollectioncollection-arraycollectioncollection)
  * [findOne](#findonecollection-arraycollectioncollection-collectioncollection)
* [Typings](#types)

# Prupose
Simple Mongo-like queries with lo-dash, at the moment the operators are very limited...

# Installation
```
npm i kuery
```

# Usage
```ts
import Kuery from 'Kuery';

interface Person {
  id: number;
  name: string;
  address?: Address;
}

interface Address {
  street: string;
}

const collection: Array<Person> = [
  { id: 1, name: 'Andreas', address: { street: 'Bellmansgatan' }},
  { id: 2, name: 'Sven' },
  { id: 3, name: 'Christian' },
  { id: 4, name: 'Emil' }
];

const idListKuery = new Kuery<Person>({ id: { $in: [1, 2] }});
expect(idListKuery.find(collection).length).toEqual(2);

const nestedPathKuery = new Kuery<Person>({ 'address.street': 'Bellmansgatan' });
expect(nestedPathKuery.find(collection).length).toEqual(1);
```

# Methods
### Kuery\<[Collection](#collection)\>(query: [Query](#query))
Creates a new Kuery constructor with query
```ts
new Kuery({ id: { $in: [1, 2] }});
```

### skip(skip: [KueryOptions['skip']](#kueryoptions))
Skips `X` from collection
```ts
const kuery = new Kuery({ id: { $in: [1, 2] }})
kuery.skip(1);
const result = kuery.find([
  { id: 1 },
  { id: 2 },
  { id: 3 },
]);
/*
  Returns:
  [{ id: 2 }]
*/
console.log(result);
```

### limit(limit: [KueryOptions['skip']](#kueryoptions))
Limits from collection
```ts
const kuery = new Kuery({ id: { $in: [1, 2] }})
kuery.limit(1);
const result = kuery.find([
  { id: 1 },
  { id: 2 },
  { id: 3 },
]);
/*
  Returns:
  [{ id: 1 }]
*/
console.log(result);
```

### sort(sort: [KueryOptions['sort']](#kueryoptions))
Sorts key(s) from collection
```ts
const kuery = new Kuery({ id: { $in: [1, 2] }})
kuery.sort({ id: 0 });
const result = kuery.find([
  { id: 1 },
  { id: 2 },
  { id: 3 },
]);
/*
  Returns:
  [ { id: 2 }, { id: 1 } ]
*/
console.log(result);
```

### find(collection: Array\<[Collection](#collection)\>): Array\<[Collection](#collection)\>
Finds your query search from collection
```ts
const kuery = new Kuery({ id: { $in: [1, 2] }})
const result = kuery.find([
  { id: 1 },
  { id: 2 },
  { id: 3 },
]);
/*
  Returns:
  [ { id: 1 }, { id: 2 } ]
*/
console.log(result);
```

### findOne(collection: Array\<[Collection](#collection)\>): [Collection](#collection)
Finds first result from your query search from collection
```ts
const kuery = new Kuery({ id: { $in: [1] }})
const result = kuery.findOne([
  { id: 1 },
  { id: 2 },
  { id: 3 },
]);
/*
  Returns:
  { id: 1 }
*/
console.log(result);
```
**CAN THROW ERROR IF FINDS MORE THAN ONE**

# Types

### KueryOptions
```ts
interface KueryOptions {
  skip: number;
  limit: number;
  sort: Record<string, number>;
}
```

### Query
```ts
type Query = Record<string, any>
```

### Collection
Generic type. When added helps support with typings of returned object of collection. Check [usage](#usage) for example.