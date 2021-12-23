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
  check: function check(key, op, returnValueForNoCandidates) {
    var res;
    if (key.indexOf('.') !== -1) {
      res = function (v) {
        var candidates = hi.collect(key)(v);
        return candidates.length === 0 ? returnValueForNoCandidates : _.some(op)(candidates);
      };
    } else {
      res = function (v) {
        return op(v[key]);
      };
    }
    return res;
  },
  compare: function COMP(key, op, arg, returnValueForNoCandidates) {
    return hi.check(key, op(_, arg), returnValueForNoCandidates || false);
  },
  exists: function exists(key, op) {
    return hi.check(key, function (v) {
      return op ? !!v : !v;
    });
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
