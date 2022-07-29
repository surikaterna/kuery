import { filter, keys, clone, forEach, flow, negate, eq, includes, gte, gt, lte, lt, get, map, some, flatten, isString, isRegExp } from 'lodash/fp';
import hi from './hidash';
import { Query } from './types';

export default class QueryCompiler {
  compile(query: Query) {
    const filters = this._compilePredicates(query) as any[];
    let filtered;
    if (filters.length === 1) {
      filtered = filter(filters[0]);
    } else {
      filtered = filters.map(function (v) {
        return filter(v);
      });
      filtered = flow(filtered);
    }
    return filtered;
  }

  _compilePredicates(query: Query): any {
    let self = this;
    let _keys = keys(query);
    let filters: any[] = [];
    // if empty query, operation = clone collection
    if (!_keys.length) {
      return clone;
    }
    forEach(function (key: string) {
      filters = filters.concat(self.compilePart(key, query[key]));
    })(_keys);
    return filters;
  }

  private getType(val: any) {
    let type = Object.prototype.toString.call(val).substr(8);
    return type.substr(0, type.length - 1);
  }

  private compilePart(key: keyof Query, queryPart: Query[keyof Query]): any {
    let op;
    let queryPartType = null;
    let type = this.getType(queryPart);
    let filter;
    let filters = [];
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
              filters.push(flow([get(key), map(hi.and(this._compilePredicates(op))), some(Boolean)]));
              break;
            case '$exists':
              filters.push(hi.exists(key, op));
              break;
            default:
              throw new Error('No support for: ' + queryPartType);
          }
        }
        break;
      case 'RegExp':
        filters.push(this.regexp(queryPart, key));
        break;
      case 'Array':
        switch (key) {
          case '$or':
            filters.push(
              // OR
              hi.or(this._subQuery(queryPart))
            );
            break;
          case '$and':
            filters.push(hi.and(this._subQuery(queryPart)));
            break;
          default:
            throw new Error('No support for: ' + key);
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
        throw new Error('Unable to parse query + ' + key + ' | ' + queryPart);
    }
    if (filters.length > 1) {
      filter = hi.and(filters);
    } else {
      filter = filters[0];
    }
    return filter;
  }

  _subQuery(queries: any): any[] {
    let res = map(this._compilePredicates.bind(this))(queries);
    // should check if there are bad side effects...
    for (let i = 0; i < res.length; i++) {
      if (res[i].length > 1) {
        res[i] = hi.and(res[i]);
      }
    }

    return flatten(res);
  }

  private regexp(regex: RegExp, key: any) {
    return hi.check(key, function (v: any) {
      return regex.test(v);
    });
  }

  private extractRegexp(regex: RegExp, options: string) {
    let patternExtractor = /\/?(.*)\/.*/;
    let re: RegExpMatchArray | RegExp | null = regex;
    if (isString(regex)) {
      re = new RegExp(regex, options);
    } else if (isRegExp(regex)) {
      if (options) {
        re = regex.toString().match(patternExtractor);
        re = new RegExp(re?.[1] ?? '', options);
      }
    } else {
      throw new Error('Wrong with regexp: ' + regex);
    }
    return re;
  }
}
