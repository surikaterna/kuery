var _ = require('lodash');
var fncs ={
	filter:function(predicate) {
		return function filter(coll) { return _.filter(coll, predicate)};
	},
	regex: function(key, regexp) {
		return fncs.filter(function(v) { return regexp.test(_.get(v,key)); });
	}
}

var QueryCompiler = function() {
}

QueryCompiler.prototype.compile = function(query) {
	var self = this;
	var keys = _.keys(query);
	
	//if empty query, operation = clone collection
	if(!keys.length) {
		return _.clone;
	}
	var filters = [];
	_.forEach(keys, function(key) {
		filters.push(self._compilePart(key,query[key]));
	});
	if(filters.length===1) {
		return filters[0];
	} else {
		return function(coll) {
			var subcoll = coll;
			for(var i=0;i<filters.length; i++) {
				subcoll = filters[i](subcoll);
			};
			return subcoll;
		};
	}
	
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
			loop: 
			for(queryPartType in queryPart) {
				var op = queryPart[queryPartType];
				switch(queryPartType) {
					case "$in": 
						fn = fncs.filter(function(v) { return _.some(op, function(e) { return e===_.get(v,key)})});
						break;
					case "$regex":
						fn = this._regexp(op, _.get(queryPart, "$options"), key);
						break loop;
					default:
						throw new Error('No support for: ' + queryPartType);
				}
			}
			break;
		case "RegExp":
			fn = fncs.regex(key, queryPart);
			break;
		default:
			fn=fncs.filter(_.matchesProperty(key, queryPart));
	}
	return fn;
};


QueryCompiler.prototype._regexp = function(regex, options, key) {
	if(_.isString(regex)) {
		regex = new RegExp(regex, options);
	} else if(_.isRegExp(regex)) {
		if(options) {
			var patternExtractor = /\/?(.*)\/.*/;
			regex = regex.toString().match(patternExtractor);
			regex = new RegExp(regex[1], options);
		}
	} else {
		throw new Error("Wrong with regexp: " + regex);
	}
	return fncs.regex(key, regex)
}


module.exports = QueryCompiler;