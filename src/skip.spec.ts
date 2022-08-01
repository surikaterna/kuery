import Kuery from '.';

const collection = [
  {
    id: 1,
    name: 'Andreas',
    address: { street: 'Bellmansgatan' },
    born: new Date('1980-01-01T12:00:00.000Z')
  },
  { id: 2, name: 'Sven', born: new Date('1989-01-01T12:00:00.000Z') },
  { id: 3, name: 'Christian', born: new Date('1990-01-01T12:00:00.000Z') },
  {
    id: 4,
    name: 'Emil',
    girlfriends: [
      { name: 'fanny', hotness: 10 },
      { name: 'eve', hotness: 1000 }
    ],
    born: new Date('1982-01-01T12:00:00.000Z')
  }
];

describe('Kuery', function () {
  describe('#skip', function () {
    it('should skip 2 documents', function () {
      const q = new Kuery({});
      q.skip(2);
      const r = q.find(collection);
      expect(r.length).toEqual(2);
      expect(r[0].id).toEqual(3);
    });
    it('should skip 2 documents with query', function () {
      const q = new Kuery({ id: { $gt: 1 } });
      q.skip(2);
      const r = q.find(collection);
      expect(r.length).toEqual(1);
      expect(r[0].id).toEqual(4);
    });
  });
  describe('#limit', function () {
    it('should limit 2 documents', function () {
      const q = new Kuery({});
      q.limit(2);
      const r = q.find(collection);
      expect(r.length).toEqual(2);
      expect(r[0].id).toEqual(1);
    });
    it('should limit 2 documents with query', function () {
      const q = new Kuery({ id: { $gt: 1 } });
      q.limit(2);
      const r = q.find(collection);
      expect(r.length).toEqual(2);
      expect(r[0].id).toEqual(2);
    });
    it('should limit 2, skip 1 documents with query', function () {
      const q = new Kuery({ id: { $gt: 1 } });
      q.limit(2).skip(1);
      const r = q.find(collection);
      expect(r.length).toEqual(2);
      expect(r[0].id).toEqual(3);
    });
  });
  describe('#sort', function () {
    it('should sort on one property', function () {
      const q = new Kuery({});
      q.sort({ born: 1 });
      const r = q.find(collection);
      expect(r.length).toEqual(collection.length);
      expect(r[0].born).toEqual(collection[0].born);
      expect(r[1].born).toEqual(collection[3].born);
    });
    it('should sort ands skip', function () {
      const q = new Kuery({});
      q.sort({ born: -1 });
      q.skip(1);
      const r = q.find(collection);
      expect(r[0].name).toEqual('Sven');
    });
  });
});
