# kuery

Simple Mongo-like queries with lo-dash, at the moment the operators are very limited...

### Usage
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