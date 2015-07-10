var Kuery = require('..');
var should = require('should');

var collection =  [
	{id:1, name:'Andreas',address:{street:'Bellmansgatan'}},
	{id:2, name:'Sven'},
	{id:3, name:'Christian'},
	{id:4, name:'Emil'},
];

describe('ViewDB', function() {
	it('should return 0 for empty collection', function() {
		var q = new Kuery({});
		q.find([]).length.should.equal(0);
	});	
	it('should return all elements for empty query', function() {
		var q = new Kuery({});
		q.find(collection).length.should.equal(4);
	});	
	it('should return correct element for property eq query', function() {
		var q = new Kuery({id:2});
		q.findOne(collection).name.should.equal('Sven');
	});	
	it('should return correct elements for property in query', function() {
		var q = new Kuery({id:{$in:[1,2]}});
		q.find(collection).length.should.equal(2);
	});	
	it('should return correct elements for property with path eq query', function() {
		var q = new Kuery({"address.street":"Bellmansgatan"});
		q.find(collection).length.should.equal(1);
	});		
	it('should return correct elements for property with path eq query', function() {
		var q = new Kuery({name:{$in:["Andreas","Emil"]}});
		q.find(collection).length.should.equal(2);
	});		
	it('should return correct elements for property in with strings query', function() {
		var q = new Kuery({name:{$in:["Andreas","Emil"]}});
		q.find(collection).length.should.equal(2);
	});	
	it('should return correct elements for composite query', function() {
		var q = new Kuery({name:{$in:["Andreas","Emil"]}, id:1});
		q.find(collection).length.should.equal(1);
	});	

});