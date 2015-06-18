var _ = require('lodash');
var fncs ={
	filter:function(predicate) {
		return function filter(coll) { return _.filter(coll, predicate)};
	}
}

var QueryCompiler = function() {
}

QueryCompiler.prototype.compile = function(query) {
	var keys = _.keys(query);
	
	//if empty query, operation = clone collection
	if(!keys.length) {
		return _.clone;
	}
	//only support property match at the moment
	return this._compilePart(keys[0],query[keys[0]]);
}

function getType(val) {
	var type;
    type = Object.prototype.toString.call(val).substr(8);
    return type.substr(0, type.length - 1);
}

QueryCompiler.prototype._compilePart = function(key, queryPart) {
	var type = getType(queryPart);
	var fn = null;
	switch(type) {
		case "Object": 
			var queryPartType = null;
			for(queryPartType in queryPart) {
				var op = queryPart[queryPartType];
				switch(queryPartType) {
					case "$in": 
						fn = fncs.filter(function(v) { return _.some(op, function(e) { return e===_.get(v,key)})});
						break;
					default:
						throw new Error('No support for: ' + queryPartType);
				}
			}
			break;
		default:
			fn=fncs.filter(_.matchesProperty(key, queryPart));
	}
	return fn;
};



module.exports = QueryCompiler;