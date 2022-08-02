import { filter, keys, clone, forEach, flow, negate, eq, includes, gte, gt, lte, lt, get, map, some, flatten, isString, isRegExp } from 'lodash/fp';
import hi, { funcArray } from "./hidash";

export type Query = Record<string, any>;
export type hasObjectQuery<T extends Query> = T extends Query ? true : false;
export type _compilePredicatesReturnType<T extends boolean> = T extends true ? funcArray<any, boolean> : typeof clone<boolean>;

export default class QueryCompiler {
  compile(query: Query) {
    const filters = this._compilePredicates(query);
    let filtered;
    if (filters.length === 1) {
      filtered = filter(filters[0]);
    } else {
      filtered = filters.map(function (v: any) {
        return filter(v);
      });
      filtered = flow(filtered);
    }
    return filtered;
  }

  _compilePredicates<Q extends Query>(query: Q): _compilePredicatesReturnType<hasObjectQuery<Q>> {
    const _keys = keys(query);
    let filters: funcArray<Query, boolean> = [];
    // if empty query, operation = clone collection
    if (!_keys.length) {
      return clone as _compilePredicatesReturnType<hasObjectQuery<Q>>;
    }
    forEach((key: string) => {
      filters = filters.concat(this.compilePart(key, query[key]));
    })(_keys);
    return filters as _compilePredicatesReturnType<hasObjectQuery<Q>>;
  }

  private getType(val: string) {
    const type = Object.prototype.toString.call(val).substr(8);
    return type.substr(0, type.length - 1);
  }

  private compilePart<K extends keyof Query>(key: K, queryPart: Query[K]): ((...args: any[]) => any) | ((args: any) => boolean) {
    let op;
    let queryPartType = null;
    const type = this.getType(queryPart);
    let filter;
    const filters = [];
    switch (type) {
      case 'Object':
        loop: for (queryPartType in queryPart) {
          op = queryPart[queryPartType];
          switch (queryPartType) {
            case '$eq':
              filters.push(hi.compare(key, eq, op));
              break;
            case '$ne':
              filters.push(negate(this.compilePart(key, op)));
              break;
            case '$in':
              filters.push(hi.compare(key, includes, op));
              break;
            case '$nin':
              filters.push(negate(hi.compare(key, includes, op)));
              break;
            case '$regex':
              filters.push(this.regexp(this.extractRegexp(op, queryPart['$options']), key));
              break loop;
            case '$gte':
              filters.push(hi.compare(key, gte, op));
              break;
            case '$lte':
              filters.push(hi.compare(key, lte, op));
              break;
            case '$gt':
              filters.push(hi.compare(key, gt, op));
              break;
            case '$lt':
              filters.push(hi.compare(key, lt, op));
              break;
            case '$elemMatch':
              filters.push(flow([get(key), map(hi.and(this._compilePredicates<Query>(op))), some(Boolean)]));
              break;
            case '$exists':
              filters.push(hi.exists(key, op));
              break;
            default:
              throw new Error(`No support for: ${queryPartType}`);
          }
        }
        break;
      case 'RegExp':
        filters.push(this.regexp(queryPart, key));
        break;
      case 'Array':
        switch (key) {
          case '$or':
            filters.push(hi.or(this._subQuery(queryPart)));
            break;
          case '$and':
            filters.push(hi.and(this._subQuery(queryPart)));
            break;
          default:
            throw new Error(`No support for: ${key}`);
        }
        break;
      // primitives
      case 'Number':
      case 'Boolean':
      case 'String':
      case 'Null':
        filters.push(hi.check(key, eq(queryPart)));
        break;
      default:
        throw new Error(`Unable to parse query + ${key} | ${queryPart}`);
    }
    if (filters.length > 1) {
      filter = hi.and(filters);
    } else {
      filter = filters[0];
    }
    return filter;
  }

  _subQuery(queries: Query[]): funcArray<any, boolean> {
    // _subQuery is suppose to return arrays of functions (check compiler.spec.ts for reference)

    // res wants arrays that contains arrays of methods,
    // [ [f], [f] ]
    // Which works until "res[i] = hi.and(res[i]);" comes in,
    // hi.and method returns a function since it combines,
    // the array contains more methods inside of itself, so it combines them
    // and returns a function. 
    // [ [f, f], [f] ] => [ f, [f] ]
    // Which doesn't work with the typings since res wants,
    // to be an array of function, not just a function.

    // It works logically since in the end we return flatten(res) which takes all of our arrays and flatten them to look like this:
    // [ [f], [f], [f] ] => [ f, f, f ]

    // We could do "res[i] = [hi.and(res[i])];" since that's kinda how it looked before, just contained more than one method inside of itself, now is just one.
    // And in the end we flatten it.

    // So the best solution is to say that res can either contain arrays of functions or just a function,
    // Then cast the type of res[i] for and
    const res: (((v: any) => boolean) | funcArray<any, boolean>)[] = map(this._compilePredicates.bind(this))(queries);
    // should check if there are bad side effects...
    for (let i = 0; i < res.length; i++) {
      // Assuming we got more functions inside of our array
      if (res[i].length > 1) {
        // Combine them into one function
        res[i] = hi.and(res[i] as funcArray<any, boolean>);
      }
    }
    return flatten(res);
  }

  private regexp(regex: RegExp, key: string) {
    return hi.check(key, function (v: string) {
      return regex.test(v);
    });
  }

  private extractRegexp(regex: RegExp, options: string) {
    const patternExtractor = /\/?(.*)\/.*/;
    let re: RegExpMatchArray | RegExp = regex;
    if (isString(regex)) {
      re = new RegExp(regex, options);
    } else if (isRegExp(regex)) {
      if (options) {
        // Assuming it can't be null due to logic
        re = regex.toString().match(patternExtractor) as RegExpMatchArray ;
        re = new RegExp(re[1], options);
      }
    } else {
      throw new Error('Wrong with regexp: ' + regex);
    }
    return re;
  }
}
