var _ = require('lodash/fp');
var __ = require('lodash');

var hi = {
  __logN: function (name) {
    return function (v) {
      console.log('>>(' + name + ') ', v);
      return v;
    };
  },
  __log: function (v) {
    console.log('>>', v);
    return v;
  },
  or: function OR(predicates) {
    return function (v) {
      var i;
      for (i = 0; i < predicates.length; i++) {
        if (predicates[i](v)) {
          return true;
        }
      }
      return false;
    };
  },
  and: function AND(predicates) {
    return function (v) {
      var i;
      for (i = 0; i < predicates.length; i++) {
        if (!predicates[i](v)) {
          return false;
        }
      }
      return true;
    };
  },
  check: function check(key, op) {
    var res;
    if (key.indexOf('.') !== -1) {
      res = _.flow([
        // collect an array of values after traversing key
        hi.collect(key),
        // op needs to be true for at least one of the values
        _.some(op)
      ]);
    } else {
      res = _.flow([
        _.get(key),
        op
      ]);
    }
    return res;
  },
  compare: function COMP(key, op, arg) {
    return hi.check(key, op(_, arg));
  },
  collect: function collect(key) {
    return function (v) {
      var path = key.split('.');
      var res = [];
      hi._collect(res, v, path);
      return res;
    };
  },
  _collect: function _collect(result, object, path) {
    var index = 0;
    var length = path.length;
    var element = object;

    if (_.isArray(object)) {
      __.forEach(object, function (e) {
        hi._collect(result, e, path);
      });
    } else {
      while ((element !== null && element !== undefined) && index < length) {
        element = element[path[index++]];
        if (_.isArray(element)) {
          hi._collect(result, element, __.slice(path, index));
          element = null;
        }
      }
      if (element) {
        result.push(element);
      }
    }
  }
};

module.exports = hi;
