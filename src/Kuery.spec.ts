import Kuery from '.';

const collection = [
  { id: 1, name: 'Andreas', address: { street: 'Bellmansgatan' }, born: new Date('1980-01-01T12:00:00.000Z'), isActive: true },
  { id: 2, name: 'Sven', address: {}, girlfriends: [{ wife: {} }], born: new Date('1989-01-01T12:00:00.000Z'), isActive: true },
  { id: 3, name: 'Christian', born: new Date('1990-01-01T12:00:00.000Z'), girlfriends: { wife: {} }, isActive: false },
  {
    id: 4,
    name: 'Emil',
    girlfriends: [
      { name: 'fanny', hotness: 10 },
      { name: 'eve', hotness: 1000 }
    ],
    born: new Date('1982-01-01T12:00:00.000Z')
  },
  { id: 5, name: 'PG', girlfriends: [{ name: 'Hanna', hotness: 200 }], born: new Date('1989-01-01T12:00:00.000Z') }
];

const collectionWithNull = [{ id: 6, name: 'KE', girlfriends: null }];

describe('Kuery', function () {
  it('should return 0 for empty collection', function () {
    const q = new Kuery({});
    expect(q.find([]).length).toEqual(0);
  });
  it('should return all elements for empty query', function () {
    const q = new Kuery({});
    expect(q.find(collection).length).toEqual(5);
  });
  it('should return correct element for property eq query', function () {
    const q = new Kuery({ id: 2 });
    expect(q.findOne(collection).name).toEqual('Sven');
  });

  it('should return correct element for property $eq query', function () {
    const q = new Kuery({ name: { $eq: 'Emil' } });
    expect(q.findOne(collection).name).toEqual('Emil');
  });

  it('should return correct element for property not eq query', function () {
    const q = new Kuery({ id: { $ne: 2 } });
    expect(q.find(collection).length).toEqual(4);
  });
  it('should return correct elements for property in query', function () {
    const q = new Kuery({ id: { $in: [1, 2] } });
    expect(q.find(collection).length).toEqual(2);
  });
  it('should return correct elements for property in $nin query', function () {
    const q = new Kuery({ id: { $nin: [1, 2] } });
    expect(q.find(collection).length).toEqual(3);
  });
  it('should return all elements for property with empty $nin query', function () {
    const q = new Kuery({ id: { $nin: [] } });
    expect(q.find(collection).length).toEqual(5);
  });
  it('should return correct elements for property with path eq query', function () {
    const q = new Kuery({ 'address.street': 'Bellmansgatan' });
    expect(q.find(collection).length).toEqual(1);
  });
  it('should return correct elements for property with path ne query', function () {
    const q = new Kuery({ 'address.street': { $ne: 'Bellmansgatan' } });
    expect(q.find(collection).length).toEqual(4);
  });
  it('should return correct elements for property with path in query', function () {
    const q = new Kuery({ name: { $in: ['Andreas', 'Emil'] } });
    expect(q.find(collection).length).toEqual(2);
  });
  it('should return correct elements for property in with strings query', function () {
    const q = new Kuery({ name: { $in: ['Andreas', 'Emil'] } });
    expect(q.find(collection).length).toEqual(2);
  });
  it('should return correct elements for property in with strings query', function () {
    const q = new Kuery({ name: { $nin: ['Andreas', 'Emil'] } });
    expect(q.find(collection).length).toEqual(3);
  });
  it('should return correct elements for composite query', function () {
    const q = new Kuery({ name: { $in: ['Andreas', 'Emil'] }, id: 1 });
    expect(q.find(collection).length).toEqual(1);
  });
  it('should return correct elements for composite query', function () {
    const q = new Kuery({ name: { $nin: ['Andreas', 'Emil'] }, id: 2 });
    expect(q.find(collection).length).toEqual(1);
  });
  it('should return correct elements for composite query', function () {
    const q = new Kuery({ name: { $nin: ['Andreas', 'Emil'] }, id: 1 });
    expect(q.find(collection).length).toEqual(0);
  });
  it('should match when object is null and nested property is checked with $nin', function () {
    const q = new Kuery({
      name: 'KE',
      'girlfriends.wife': { $nin: ['Shin Hye-sun'] }
    });
    expect(q.find(collectionWithNull).length).toEqual(1);
  });
  it('should match when object is null and nested property is checked with $ne', function () {
    const q = new Kuery({
      name: 'KE',
      'girlfriends.wife': { $ne: 'Shin Hye-sun' }
    });
    expect(q.find(collectionWithNull).length).toEqual(1);
  });
  it('should not match when object is null and nested property is checked with $in', function () {
    const q = new Kuery({
      name: 'KE',
      'girlfriends.wife': { $in: ['Shin Hye-sun'] }
    });
    expect(q.find(collectionWithNull).length).toEqual(0);
  });
  it('should not match when object is null and nested property is checked with $eq', function () {
    const q = new Kuery({
      name: 'KE',
      'girlfriends.wife': { $eq: 'Shin Hye-sun' }
    });
    expect(q.find(collectionWithNull).length).toEqual(0);
  });
  it('should return correct elements for regex string query', function () {
    const q = new Kuery({ name: { $regex: 'Andr.*', $options: 'i' } });
    expect(q.find(collection).length).toEqual(1);
  });
  it('should return correct elements for regex native query', function () {
    const q = new Kuery({ name: { $regex: /andr.*/, $options: 'i' } });
    expect(q.find(collection).length).toEqual(1);
  });
  it('should return correct elements for inline regex query', function () {
    const q = new Kuery({ name: /andr.*/i });
    expect(q.find(collection).length).toEqual(1);
  });
  it('should return correct elements for $or query', function () {
    const q = new Kuery({
      $or: [{ name: /andr.*/i }, { name: /emil.*/i }]
    });
    expect(q.find(collection).length).toEqual(2);
  });
  it('should return correct elements for $or query when both sides return same element', function () {
    const q = new Kuery({
      $or: [{ name: /andr.*/i }, { name: /andr.*/i }]
    });
    expect(q.find(collection).length).toEqual(1);
  });

  it('should return correct elements for property with path eq query with arrays', function () {
    const q = new Kuery({ 'girlfriends.name': 'eve' });
    expect(q.find(collection).length).toEqual(1);
  });
  it('should return correct element for property gte query', function () {
    const q = new Kuery({ id: { $gte: 2 } });
    expect(q.find(collection).length).toEqual(4);
  });
  it('should return correct element for property lte query', function () {
    const q = new Kuery({ id: { $lte: 2 } });
    expect(q.find(collection).length).toEqual(2);
  });
  it('should return correct element for property gt query', function () {
    const q = new Kuery({ id: { $gt: 2 } });
    expect(q.find(collection).length).toEqual(3);
  });
  it('should return correct element for property lt query', function () {
    const q = new Kuery({ id: { $lt: 2 } });
    expect(q.find(collection).length).toEqual(1);
  });
  it('should return correct element for property lte date query', function () {
    const q = new Kuery({ born: { $lte: new Date('1981-01-01') } });
    expect(q.find(collection).length).toEqual(1);
  });
  it('should return correct element for property gte date query', function () {
    const q = new Kuery({ born: { $gte: new Date('1981-01-01') } });
    expect(q.find(collection).length).toEqual(4);
  });
  it('should return correct element for property gte/lte date query', function () {
    const q = new Kuery({ born: { $gte: new Date('1981-01-01'), $lte: new Date('1990-01-01') } });
    expect(q.find(collection).length).toEqual(3);
  });
  it('should return no elemenst for single elemMatch query with no match', function () {
    const q = new Kuery({ girlfriends: { $elemMatch: { hotness: 222 } } });
    expect(q.find(collection).length).toEqual(0);
  });
  it('should return correct element for single elemMatch query', function () {
    const q = new Kuery({ girlfriends: { $elemMatch: { hotness: 10 } } });
    expect(q.find(collection).length).toEqual(1);
  });
  it('should return correct element for multipart elemMatch query', function () {
    const q = new Kuery({ girlfriends: { $elemMatch: { hotness: 10, name: 'fanny' } } });
    expect(q.find(collection).length).toEqual(1);
  });
  it('should return correct element for multipart elemMatch query asserting with $eq and $ne', function () {
    const q = new Kuery({ girlfriends: { $elemMatch: { hotness: { $eq: 10 }, name: { $ne: 'eve' } } } });
    const col = q.find(collection);
    expect(col.length).toEqual(1);
    expect(col[0].name).toEqual('Emil');
  });
  it('should return no element for multipart elemMatch query matching different array elements', function () {
    const q = new Kuery({ girlfriends: { $elemMatch: { hotness: 10, name: 'eve' } } });
    expect(q.find(collection).length).toEqual(0);
  });
  it('should return correct elements for property with path $regexp with arrays', function () {
    const q = new Kuery({ 'girlfriends.name': { $regex: 'ev.*', $options: 'i' } });
    expect(q.find(collection).length).toEqual(1);
  });
  it('should return elements where given element exists is true', function () {
    const q = new Kuery({ address: { $exists: true } });
    expect(q.find(collection).length).toEqual(2);
  });
  it('should return elements where given element exists is false', function () {
    const q = new Kuery({ girlfriends: { $exists: false } });
    expect(q.find(collection).length).toEqual(1);
  });
  it('should return elements where given element exists deeply', function () {
    const q = new Kuery({ 'girlfriends.wife': { $exists: true } });
    expect(q.find(collection).length).toEqual(2);
  });
  it('should return elements when query for boolean', function () {
    const q = new Kuery({ isActive: true });
    expect(q.find(collection).length).toEqual(2);
  });
  it('$or should do implicit and on subqueries', function () {
    const q = new Kuery({
      $or: [
        {
          'girlfriends.name': 'Hanna',
          'girlfriends.hotness': 10
        },
        { 'girlfriends.hotness': 1000 }
      ]
    });
    expect(q.find(collection).length).toEqual(1);
  });
});
