var _ = require('lodash/fp');
var Kuery = require('..');
var should = require('should');


var collection = [
  { id: 1, name: 'Andreas', address: { street: 'Bellmansgatan' }, born: new Date('1980-01-01T12:00:00.000Z'), isActive: true },
  { id: 2, name: 'Sven', address: {}, girlfriends: [{ wife: {} }], born: new Date('1989-01-01T12:00:00.000Z'), isActive: true },
  { id: 3, name: 'Christian', born: new Date('1990-01-01T12:00:00.000Z'), girlfriends: { wife: {} }, isActive: false },
  { id: 4, name: 'Emil', girlfriends: [{ name: 'fanny', hotness: 10 }, { name: 'eve', hotness: 1000 }], born: new Date('1982-01-01T12:00:00.000Z') },
  { id: 5, name: 'PG', girlfriends: [{ name: 'Hanna', hotness: 200 }], born: new Date('1989-01-01T12:00:00.000Z') }
];

describe('Kuery', function () {
  it('should return 0 for empty collection', function () {
    var q = new Kuery({});
    q.find([]).length.should.equal(0);
  });
  it('should return all elements for empty query', function () {
    var q = new Kuery({});
    q.find(collection).length.should.equal(5);
  });
  it('should return correct element for property eq query', function () {
    var q = new Kuery({ id: 2 });
    q.findOne(collection).name.should.equal('Sven');
  });

  it('should return correct element for property $eq query', function () {
    var q = new Kuery({ name: { $eq: 'Emil' } });
    q.findOne(collection).name.should.equal('Emil');
  });

  it('should return correct element for property not eq query', function () {
    var q = new Kuery({ id: { $ne: 2 } });
    q.find(collection).length.should.equal(4);
  });
  it('should return correct elements for property in query', function () {
    var q = new Kuery({ id: { $in: [1, 2] } });
    q.find(collection).length.should.equal(2);
  });
  it('should return correct elements for property in $nin query', function () {
    var q = new Kuery({ id: { $nin: [1, 2] } });
    q.find(collection).length.should.equal(3);
  });
  it('should return correct elements for property with path eq query', function () {
    var q = new Kuery({ 'address.street': 'Bellmansgatan' });
    q.find(collection).length.should.equal(1);
  });
  it('should return correct elements for property with path ne query', function () {
    var q = new Kuery({ 'address.street': { $ne: 'Bellmansgatan' } });
    q.find(collection).length.should.equal(4);
  });
  it('should return correct elements for property with path in query', function () {
    var q = new Kuery({ name: { $in: ['Andreas', 'Emil'] } });
    q.find(collection).length.should.equal(2);
  });
  it('should return correct elements for property in with strings query', function () {
    var q = new Kuery({ name: { $in: ['Andreas', 'Emil'] } });
    q.find(collection).length.should.equal(2);
  });
  it('should return correct elements for property in with strings query', function () {
    var q = new Kuery({ name: { $nin: ['Andreas', 'Emil'] } });
    q.find(collection).length.should.equal(3);
  });
  it('should return correct elements for composite query', function () {
    var q = new Kuery({ name: { $in: ['Andreas', 'Emil'] }, id: 1 });
    q.find(collection).length.should.equal(1);
  });
  it('should return correct elements for composite query', function () {
    var q = new Kuery({ name: { $nin: ['Andreas', 'Emil'] }, id: 2 });
    q.find(collection).length.should.equal(1);
  });
  it('should return correct elements for composite query', function () {
    var q = new Kuery({ name: { $nin: ['Andreas', 'Emil'] }, id: 1 });
    q.find(collection).length.should.equal(0);
  });
  it('should return correct elements for regex string query', function () {
    var q = new Kuery({ name: { $regex: 'Andr.*', $options: 'i' } });
    q.find(collection).length.should.equal(1);
  });
  it('should return correct elements for regex native query', function () {
    var q = new Kuery({ name: { $regex: /andr.*/, $options: 'i' } });
    q.find(collection).length.should.equal(1);
  });
  it('should return correct elements for inline regex query', function () {
    var q = new Kuery({ name: /andr.*/i });
    q.find(collection).length.should.equal(1);
  });
  it('should return correct elements for $or query', function () {
    var q = new Kuery({
      $or: [
        { name: /andr.*/i }
        , { name: /emil.*/i }
      ]
    });
    q.find(collection).length.should.equal(2);
  });
  it('should return correct elements for $or query when both sides return same element', function () {
    var q = new Kuery({
      $or: [
        { name: /andr.*/i },
        { name: /andr.*/i }
      ]
    });
    q.find(collection).length.should.equal(1);
  });

  it('should return correct elements for property with path eq query with arrays', function () {
    var q = new Kuery({ 'girlfriends.name': 'eve' });
    q.find(collection).length.should.equal(1);
  });
  it('should return correct element for property gte query', function () {
    var q = new Kuery({ id: { $gte: 2 } });
    q.find(collection).length.should.equal(4);
  });
  it('should return correct element for property lte query', function () {
    var q = new Kuery({ id: { $lte: 2 } });
    q.find(collection).length.should.equal(2);
  });
  it('should return correct element for property gt query', function () {
    var q = new Kuery({ id: { $gt: 2 } });
    q.find(collection).length.should.equal(3);
  });
  it('should return correct element for property lt query', function () {
    var q = new Kuery({ id: { $lt: 2 } });
    q.find(collection).length.should.equal(1);
  });
  it('should return correct element for property lte date query', function () {
    var q = new Kuery({ born: { $lte: new Date('1981-01-01') } });
    q.find(collection).length.should.equal(1);
  });
  it('should return correct element for property gte date query', function () {
    var q = new Kuery({ born: { $gte: new Date('1981-01-01') } });
    q.find(collection).length.should.equal(4);
  });
  it('should return correct element for property gte/lte date query', function () {
    var q = new Kuery({ born: { $gte: new Date('1981-01-01'), $lte: new Date('1990-01-01') } });
    q.find(collection).length.should.equal(3);
  });
  it('should return no elemenst for single elemMatch query with no match', function () {
    var q = new Kuery({ girlfriends: { $elemMatch: { hotness: 222 } } });
    q.find(collection).length.should.equal(0);
  });
  it('should return correct element for single elemMatch query', function () {
    var q = new Kuery({ girlfriends: { $elemMatch: { hotness: 10 } } });
    q.find(collection).length.should.equal(1);
  });
  it('should return correct element for multipart elemMatch query', function () {
    var q = new Kuery({ girlfriends: { $elemMatch: { hotness: 10, name: 'fanny' } } });
    q.find(collection).length.should.equal(1);
  });
  it('should return correct element for multipart elemMatch query asserting with $eq and $ne', function () {
    var q = new Kuery({ girlfriends: { $elemMatch: { hotness: { $eq: 10 }, name: { $ne: 'eve' } } } });
    const col = q.find(collection);
    col.length.should.equal(1);
    col[0].name.should.equal('Emil');
  });
  it('should return no element for multipart elemMatch query matching different array elements', function () {
    var q = new Kuery({ girlfriends: { $elemMatch: { hotness: 10, name: 'eve' } } });
    q.find(collection).length.should.equal(0);
  });
  it('should return correct elements for property with path $regexp with arrays', function () {
    var q = new Kuery({ 'girlfriends.name': { $regex: 'ev.*', $options: 'i' } });
    q.find(collection).length.should.equal(1);
  });
  it('should return elements where given element exists is true', function () {
    var q = new Kuery({ address: { $exists: true } });
    q.find(collection).length.should.equal(2);
  });
  it('should return elements where given element exists is false', function () {
    var q = new Kuery({ girlfriends: { $exists: false } });
    q.find(collection).length.should.equal(1);
  });
  it('should return elements where given element exists deeply', function () {
    var q = new Kuery({ 'girlfriends.wife': { $exists: true } });
    q.find(collection).length.should.equal(2);
  });
  it('should return elements when query for boolean', function () {
    var q = new Kuery({ isActive: true });
    q.find(collection).length.should.equal(2);
  });
  it('$or should do implicit and on subqueries', function () {
    var q = new Kuery({
      $or: [
        {
          'girlfriends.name': 'Hanna',
          'girlfriends.hotness': 10
        },
        { 'girlfriends.hotness': 1000 }
      ]
    });
    q.find(collection).length.should.equal(1);
  });

});
