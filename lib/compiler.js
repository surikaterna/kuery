var _ = require('lodash/fp');
var hi = require('./hidash');

var QueryCompiler = function () {
}

QueryCompiler.prototype.compile = function (query) {
	var filters = this._compilePredicates(query);
	if (filters.length === 1) {
		return _.filter(filters[0]);
	} else {
		var filtered = filters.map(function (v) {
			return _.filter(v);
		});
		return _.flow(filtered);
	}
}

QueryCompiler.prototype._compilePredicates = function (query) {
	var self = this;
	var keys = _.keys(query);
	//if empty query, operation = clone collection
	if (!keys.length) {
		return _.clone;
	}
	var filters = [];
	_.forEach(function (key) {
		filters = filters.concat(self._compilePart(key, query[key]));
	})(keys);
	return filters;
}

function getType(val) {
	var type;
	type = Object.prototype.toString.call(val).substr(8);
	return type.substr(0, type.length - 1);
}

QueryCompiler.prototype._compilePart = function (key, queryPart) {
	var type = getType(queryPart);
	var filters = [];
	// console.log(arguments);
	switch (type) {
		case "Object":
			var queryPartType = null;
			loop:
			for (queryPartType in queryPart) {
				var op = queryPart[queryPartType];
				switch (queryPartType) {
					case "$ne":
						filters.push(_.negate(this._compilePart(key, op)));
						break;
					case "$in":
						filters.push(hi.compare(key, _.includes, op));
						break;
					case "$regex":
						filters.push(
							this._regex(this._extractRegexp(op, queryPart["$options"]), key)
						);
						break loop;
					case "$gte":
						filters.push(hi.compare(key, _.gte, op));
						break;
					case "$lte":
						filters.push(hi.compare(key, _.lte, op));
						break;
					case "$gt":
						filters.push(hi.compare(key, _.gt, op));
						break;
					case "$lt":
						filters.push(hi.compare(key, _.lt, op));
						break;
					default:
						throw new Error('No support for: ' + queryPartType);
				}
			}
			break;
		case "RegExp":
			filters.push(this._regex(queryPart, key));
			break;
		case "Array":
			switch (key) {
				case "$or":
					filters.push(
						// OR
						hi.or(this._subQuery(key, queryPart))
					);
					break;
				default:
					throw new Error('No support for: ' + key);
			}
			break;
		//primitives
		case 'Number':
		case 'String':
			filters.push(hi.check(key, _.eq(queryPart)));
			break;
		default:
			throw new Error('Unable to parse query + ' + key + ' | ' + queryPart);
	}
	var filter;
	if (filters.length > 1) {
		filter = hi.and(filters);
	} else {
		filter = filters[0];
	}
	return filter;
}

QueryCompiler.prototype._subQuery = function (key, queries) {
	return _.flatten(_.map(this._compilePredicates.bind(this))(queries));
}

QueryCompiler.prototype._regex = function regexp(regex, key) {
	return hi.check(key, function (v) {
		return regex.test(v);
		}
	);
}

QueryCompiler.prototype._extractRegexp = function (regex, options) {
	var re = regex;
	if (_.isString(regex)) {
		re = new RegExp(regex, options);
	} else if (_.isRegExp(regex)) {
		if (options) {
			var patternExtractor = /\/?(.*)\/.*/;
			re = regex.toString().match(patternExtractor);
			re = new RegExp(re[1], options);
		}
	} else {
		throw new Error("Wrong with regexp: " + regex);
	}
	return re;
}


module.exports = QueryCompiler;