var QueryCompiler = require('./compiler');



var Kuery = function(query) {
	this._query = query || {}
	this._compiler = new QueryCompiler();
}

Kuery.prototype.find = function(collection) {
	var compiledQuery = this._compiler.compile(this._query);
	return compiledQuery(collection);
};

Kuery.prototype.findOne = function(collection) {
	var result = this.find(collection);
	if(result.length !== 1) {
		throw new Error('findOne returned ' + result.length + ' results.');
	}
	return result[0];
};



module.exports = Kuery;