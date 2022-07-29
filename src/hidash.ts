import _ from "lodash/fp";
import __ from "lodash";

const hi = {
  __logN: function (name: any) {
    return function (v: any) {
      // @ts-ignore
      console.log('>>(' + name + ') ', v);
      return v;
    }
  },
  __log: function (v: any) {
    // @ts-ignore
    console.log('>>', v);
    return v;
  },
  or: function OR(predicates: any) {
    return function (v: any) {
      var i;
      for (i = 0; i < predicates.length; i++) {
        if (predicates[i](v)) {
          return true;
        }
      }
      return false;
    };
  },
  and: function AND(predicates: any) {
    return function (v: any) {
      var i;
      for (i = 0; i < predicates.length; i++) {
        if (!predicates[i](v)) {
          return false;
        }
      }
      return true;
    };
  },
  check: function check(key: any, op: any) {
    var res;
    if (key.indexOf('.') !== -1) {
      res = function (v: any) {
        return _.some(op)(hi.collect(key)(v));
      };
    } else {
      res = function (v: any) {
        return op(v[key]);
      };
    }
    return res;
  },
  compare: function COMP(key: any, op: any, arg: any) {
    return hi.check(key, op(_, arg));
  },
  exists: function exists(key: any, op: any) {
    return hi.check(key, function (v: any) {
      return op ? !!v : !v;
    });
  },
  collect: function collect(key: any) {
    return function (v: any) {
      var path = key.split('.');
      var res: any[] = [];
      hi._collect(res, v, path);
      return res;
    };
  },
  _collect: function _collect(result: any, object: any, path: any) {
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
}

export default hi;
