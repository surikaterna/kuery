var _ = require('lodash/fp');
var Kuery = require('..');
var should = require('should');


var collection = [
  {
    id: 1, name: 'Andreas', address: { street: 'Bellmansgatan' },
    born: new Date('1980-01-01T12:00:00.000Z')
  },
  { id: 2, name: 'Sven', born: new Date('1989-01-01T12:00:00.000Z') },
  { id: 3, name: 'Christian', born: new Date('1990-01-01T12:00:00.000Z') },
  {
    id: 4, name: 'Emil', girlfriends: [{ name: 'fanny', hotness: 10 },
      { name: 'eve', hotness: 1000 }], born: new Date('1982-01-01T12:00:00.000Z')
  }
];
var coll2 = [];
for (var i = 0; i < 10000; i++) {
  coll2[i] = { id: i, age: { years: i } };
}


describe('Kuery', function () {
  describe('#skip', function () {
    it('should skip 2 documents', function () {
      var r;
      var q = new Kuery({});
      q.skip(2);
      r = q.find(collection);
      r.length.should.equal(2);
      r[0].id.should.equal(3);
    });
    it('should skip 2 documents with query', function () {
      var r;
      var q = new Kuery({ id: { $gt: 1 } });
      q.skip(2);
      r = q.find(collection);
      r.length.should.equal(1);
      r[0].id.should.equal(4);
    });
  });
  describe('#limit', function () {
    it('should limit 2 documents', function () {
      var r;
      var q = new Kuery({});
      q.limit(2);
      r = q.find(collection);
      r.length.should.equal(2);
      r[0].id.should.equal(1);
    });
    it('should limit 2 documents with query', function () {
      var r;
      var q = new Kuery({ id: { $gt: 1 } });
      q.limit(2);
      r = q.find(collection);
      r.length.should.equal(2);
      r[0].id.should.equal(2);
    });
    it('should limit 2, skip 1 documents with query', function () {
      var r;
      var q = new Kuery({ id: { $gt: 1 } });
      q.limit(2).skip(1);
      r = q.find(collection);
      r.length.should.equal(2);
      r[0].id.should.equal(3);
    });
  });
});
