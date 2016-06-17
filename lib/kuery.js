var QueryCompiler = require('./compiler');
var Kuery = function (query) {
  this._query = query || {};
  this._compiledQuery = new QueryCompiler().compile(this._query);
};

Kuery.prototype.find = function (collection) {
  return this._compiledQuery(collection);
};

Kuery.prototype.findOne = function (collection) {
  var result = this.find(collection);
  if (result.length !== 1) {
    throw new Error('findOne returned ' + result.length + ' results.');
  }
  return result[0];
};

module.exports = Kuery;
