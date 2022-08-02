import { drop, flow, keys, map, orderBy, take } from 'lodash/fp';
import QueryCompiler, { Query } from './QueryCompiler';

export interface KueryOptions {
  skip: number;
  limit: number;
  sort: Record<string, number>;
}

class Kuery<T extends object = Record<string, any>> {
  protected query: Query;
  protected compiler: (...args: any[]) => any;
  protected options: Partial<KueryOptions>;

  constructor(query: Query) {
    this.query = query;
    this.compiler = new QueryCompiler().compile(this.query);
    this.options = {};
  }

  skip(skip: KueryOptions['skip']) {
    this.options.skip = skip;
    return this;
  }

  limit(limit: KueryOptions['limit']) {
    this.options.limit = limit;
    return this;
  }

  sort(sort: KueryOptions['sort']) {
    this.options.sort = sort;
    return this;
  }

  find(collection: Array<T>): Array<T> {
    let q: ((typeof this.compiler) | (typeof flow)) | (Array<(typeof this.compiler)>) | ((a: T) => T[]) = [this.compiler];

    // Check if we have sort, if we do push it into q
    if (this.options.sort) {
      const sortKeys = keys(this.options.sort);
      const sortDir = map((key: string) => {
        // Typescript doesn't understand that is can't be undefined so casting it for now..
        if ((this.options.sort as KueryOptions["sort"])[key] > 0) return 'asc';
        else return 'desc';
      })(sortKeys);
      q.push(orderBy(sortKeys, sortDir));
    }

    // Check if we have skip, if we do push it into q
    if (this.options.skip) {
      q.push(drop(this.options.skip));
    }

    // Check if we have limit, if we do push it into q
    if (this.options.limit) {
      q.push(take(this.options.limit));
    }

    if (q.length > 1) {
      q = flow(q);
    } else {
      q = q[0];
    }

    return q(collection);
  }

  findOne(collection: Array<T>): T {
    const result = this.find(collection);
    if (result.length !== 1) {
      throw new Error(`findOne returned ${result.length} results`);
    }
    return result[0];
  }
}

export default Kuery;
