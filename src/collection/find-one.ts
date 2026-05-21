import type { Query } from "../compile.js";
import type { CompileFilterOptions, FilterFn } from "../filter-compiler.js";
import { compileFilter } from "../filter-compiler.js";
import type { TypedQuery } from "../typed-query.js";

/**
 * Find the first document matching a query, or undefined if none match.
 *
 * NOTE: Unlike `Kuery.findOne()` which asserts exactly one match (throws on 0 or 2+),
 * this standalone function returns the first match without uniqueness assertion.
 */
export function findOne<T>(
  collection: readonly T[],
  query: TypedQuery<T>,
  options?: CompileFilterOptions,
): T | undefined;
export function findOne<T>(collection: readonly T[], query: Query, options?: CompileFilterOptions): T | undefined;
export function findOne<T>(collection: readonly T[], query: Query, options?: CompileFilterOptions): T | undefined {
  const filter = compileFilter(query, options) as FilterFn<T>;
  for (const item of collection) {
    if (filter(item)) {
      return item;
    }
  }
  return undefined;
}
