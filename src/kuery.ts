import _ from "lodash/fp";
import QueryCompiler from "./compiler";
import { Collection, KueryOptions, Query } from "./types";

class Kuery {

  protected query: Query;
  protected compiler: (...args: any) => void;
  protected options: KueryOptions;

  constructor(query: Query) {
    this.query = query;
    this.compiler = new QueryCompiler().compile(this.query);
    this.options = {} as KueryOptions;
  }

  skip(skip: KueryOptions['skip']) {
    this.options.skip = skip;
    return this;
  };
  
  limit(limit: KueryOptions['limit']) {
    this.options.limit = limit;
    return this;
  };
  
  sort(sort: KueryOptions['sort']) {
    this.options.sort = sort;
    return this;
  };
  
  find<T extends Collection>(collection: T): T {
    let q: any = [this.compiler];
    
    // Check if we have sort, if we do push it into q
    if (this.options.sort) {
      let self = this;
      let sortKeys = _.keys(this.options.sort);
      let sortDir = _.map(function (key: string) {
        if (self.options.sort[key] > 0)
          return 'asc';
        else
          return 'desc';
      })(sortKeys);
      q.push(_.orderBy(sortKeys, sortDir));
    }

    // Check if we have skip, if we do push it into q
    if (this.options.skip) {
      q.push(_.drop(this.options.skip));
    }

    // Check if we have limit, if we do push it into q
    if (this.options.limit) {
      q.push(_.take(this.options.limit));
    }

    if (q.length > 1) {
      q = _.flow(q);
    } else {
      q = q[0];
    }

    return q(collection);
  };
  
  findOne<T extends Collection>(collection: T): T[0] {
    let result = this.find(collection);
    if (result.length !== 1) {
      throw new Error('findOne returned ' + result.length + ' results.');
    }
    return result[0];
  };
}

export default Kuery;