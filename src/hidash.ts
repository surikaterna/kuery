import { forEach, slice } from 'lodash';
import fp, { isArray, some } from 'lodash/fp';

const hi = {
  __logN: function (name: any) {
    return function (v: any) {
      console.log('>>(' + name + ') ', v);
      return v;
    };
  },
  __log: function (v: any) {
    console.log('>>', v);
    return v;
  },
  or: function OR(predicates: Array<(t: any) => boolean>) {
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
  and: function AND(predicates: Array<(t: any) => boolean>) {
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
  check: function check(key: string, op: (t: any) => boolean) {
    var res;
    if (key.indexOf('.') !== -1) {
      res = function (v: any) {
        return some(op)(hi.collect(key)(v));
      };
    } else {
      res = function (v: any) {
        return op(v[key]);
      };
    }
    return res;
  },
  compare: function COMP(key: string, op: any, arg: any) {
    return hi.check(key, op(fp, arg));
  },
  exists: function exists(key: any, op: any) {
    return hi.check(key, function (v: any) {
      return op ? !!v : !v;
    });
  },
  collect: function collect(key: string) {
    return function (v: any) {
      var path = key.split('.');
      var res: any[] = [];
      hi._collect(res, v, path);
      return res;
    };
  },
  _collect: function _collect(result: any[], object: any, path: any) {
    var index = 0;
    var length = path.length;
    var element = object;

    if (isArray(object)) {
      forEach(object, function (e) {
        hi._collect(result, e, path);
      });
    } else {
      while (element !== null && element !== undefined && index < length) {
        element = element[path[index++]];
        if (isArray(element)) {
          hi._collect(result, element, slice(path, index));
          element = null;
        }
      }
      if (element) {
        result.push(element);
      }
    }
  }
};

export default hi;
