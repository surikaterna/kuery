var _ = require('lodash');
var fncs ={
	filter:function(predicate) {
		return function filter(coll) { return _.filter(coll, predicate)};
	},
	comp: function(key, comparator, value) {
		return function(v) {
			return comparator.call(this, _.get(v, key), value);
		}
	},
	not: function(expression) {
		return function not() { 
			return !expression.apply(this, arguments); }
	},
	regex: function(key, regexp) {
		return fncs.filter(function(v) { return regexp.test(_.get(v,key)); });
	},
	filterDeep: function(key, target) {
		var path = key.split('.');
		return fncs.filter(function(v) {
			var res = [];
			_collect(res, v, path);
			return _.includes(res, target);
		  });
	},
	filterNeDeep: function(key, target) {
		var path = key.split('.');
		return fncs.filter(fncs.not(function(v) {
			var res = [];
			_collect(res, v, path);
			return _.includes(res, target);
		  }));
	}
}

function _collect(result, object, path) {
	if(_.isArray(object)) {
		_.forEach(object, function(element) {
			_collect(result, element, path);
		});
	} else {
		var index = 0;
		var length = path.length;
		var element = object;
	   while (element != null && index < length) {
			element = element[path[index++]];
			if(_.isArray(element)) {
				_collect(result, element, _.slice(path, index));
				element = null;
			}
		}
		if(element) {
			result.push(element);
		}
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
		filters = filters.concat(self._compilePart(key,query[key]));
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
	var filters = [];
	switch(type) {
		case "Object":
			var queryPartType = null;
			loop:
			for(queryPartType in queryPart) {
				var op = queryPart[queryPartType];
				switch(queryPartType) {
					case "$in":
						filters.push(fncs.filter(function(v) { return _.some(op, function(e) { return e===_.get(v,key)})}));
						break;

					case "$ne":
						if(key.indexOf('.')!==-1) {
							filters.push(fncs.filterNeDeep(key, op));
						} else {
							filters.push(fncs.filter(fncs.not(_.matchesProperty(key, op))));
						}
						break;
					case "$regex":
						filters.push(this._regexp(op, _.get(queryPart, "$options"), key));
						break loop;
					case "$gte":
						filters.push(fncs.filter(fncs.comp(key, _.gte, op)));
						break;
					case "$lte": 
						filters.push(fncs.filter(fncs.comp(key, _.lte, op)));
						break;
					case "$gt":
						filters.push(fncs.filter(fncs.comp(key, _.gt, op)));
						break;
					case "$lt":
						filters.push(fncs.filter(fncs.comp(key, _.lt, op)));
						break;
					default:
						throw new Error('No support for: ' + queryPartType);
				}
			}
			break;
		case "RegExp":
			filters.push(fncs.regex(key, queryPart));
			break;
		case "Array":
			switch(key) {
				case "$or":
					filters.push(this._subQuery(key, queryPart));
				break;
				default:
					throw new Error('No support for: ' + key);
		}
		break;
		default:
			if(key.indexOf('.')!==-1) {
				filters.push(fncs.filterDeep(key, queryPart));
			} else {
				filters.push(fncs.filter(_.matchesProperty(key, queryPart)));
			}
	}
	return filters;
};


QueryCompiler.prototype._subQuery = function(key, queries) {
	var subQueries = _.map(queries, this.compile.bind(this));
	return function(coll) {
		//or
		var results = _.map(subQueries, function(qry) {
			return qry(coll);
		});
		results = _.flatten(results);
		results = _.uniq(results);;
		return results;
	}
}

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
