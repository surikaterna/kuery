import { forEach, slice } from 'lodash';
import fp, { isArray, some } from 'lodash/fp';

export type funcArray<A, R> = Array<(t: A) => R>;

const hidash = {
  or: function OR(predicates: funcArray<any, boolean>) {
    return function (v: any) {
      for (let i = 0; i < predicates.length; i++) {
        if (predicates[i](v)) {
          return true;
        }
      }
      return false;
    };
  },
  and: function AND(predicates: funcArray<any, boolean>) {
    return function (v: any) {
      let i;
      for (i = 0; i < predicates.length; i++) {
        if (!predicates[i](v)) {
          return false;
        }
      }
      return true;
    };
  },
  check: function check(key: string, op: (t: any) => boolean) {
    let res;
    if (key.indexOf('.') !== -1) {
      res = function (v: any) {
        return some(op)(hidash.collect(key)(v));
      };
    } else {
      res = function (v: any) {
        return op(v[key]);
      };
    }
    return res;
  },
  compare: function COMP(key: string, op: (...a: any) => any, arg: number | object) {
    return hidash.check(key, op(fp, arg));
  },
  exists: function exists(key: string, op: boolean) {
    return hidash.check(key, function (v: any) {
      return op ? !!v : !v;
    });
  },
  collect: function collect(key: string) {
    return function (v: any) {
      let path = key.split('.');
      let res: any[] = [];
      hidash._collect(res, v, path);
      return res;
    };
  },
  _collect: function _collect<R>(result: Array<R>, object: any, path: string[]) {
    let index = 0;
    let length = path.length;
    let element = object;

    if (isArray(object)) {
      forEach(object, function (e) {
        hidash._collect(result, e, path);
      });
    } else {
      while (element !== null && element !== undefined && index < length) {
        element = element[path[index++]];
        if (isArray(element)) {
          hidash._collect(result, element, slice(path, index));
          element = null;
        }
      }
      if (element) {
        result.push(element);
      }
    }
  }
};

export default hidash;
