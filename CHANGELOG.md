# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [2.0.0] — 2026-05-21

### ⚠️ Breaking Changes

- **`$exists` semantics**: Now checks actual key presence instead of truthiness (`!!value`).
  Documents with fields set to `null`, `0`, `""`, or `false` now match `{ $exists: true }`.
  Previously only truthy values matched. This aligns with MongoDB behavior.

- **Array field element-wise matching**: `$eq`, `$ne`, `$in`, `$nin` on array-valued fields
  now check elements individually (MongoDB behavior). Previously treated the array as an
  opaque value using reference equality.

- **Falsy dot-path leaf collection**: Dot-path traversal through arrays now correctly
  collects falsy leaf values (`0`, `""`, `false`, `null`). Previously these were silently
  dropped due to a truthiness check in the collector.

- **Error type**: `findOne` and other validation errors now throw `KueryError` (extends
  `Error`) with a typed `.code` property instead of generic `Error` instances.

- **lodash removed**: Zero runtime dependencies. The `lodash` peer/dependency is no longer
  needed.

### Added

- Full TypeScript support with included type declarations
- ESM + CJS dual package format
- `TypedQuery<T>` for type-safe queries with autocomplete on dot-paths
- `compileFilter(query)` — compile query to reusable native filter function
- `compile(query)` — compile query to inspectable AST
- `evaluate(ast, scope)` — evaluate AST expressions
- `find(collection, query, options?)` — standalone collection find
- `findOne(collection, query, options?)` — standalone findOne (returns first match or `undefined`)
- `evaluateWithTrace(ast, scope)` — diagnostics with failure traces
- `OperatorRegistry` — register custom operators
- `$nor` operator — logical NOR (none of the conditions match)
- `$all` operator — array contains all specified elements
- `$size` operator — array has exactly N elements
- Prototype pollution protection (blocks `__proto__`, `constructor`, `prototype` in paths)
- Regex caching for repeated pattern compilation
- Sub-path exports: `kuery/filter`, `kuery/compile`, `kuery/evaluate`, `kuery/operators`,
  `kuery/ast`, `kuery/errors`, `kuery/trace`, `kuery/safe-path`, `kuery/collection`

### Changed

- Type-mismatched comparisons (`$gt`/`$gte`/`$lt`/`$lte` across number/string) silently
  return `false` instead of producing undefined behavior through lodash type coercion.
- Sort direction accepts only `1` (ascending) and `-1` (descending). Value `0` previously
  sorted descending; now it produces no-op ordering.
- `findOne` on the `Kuery` class throws `KueryError` with code `KUERY_FIND_ONE` instead
  of generic `Error`.

### Removed

- `lodash` dependency (zero runtime dependencies)
- Legacy CJS-only module format (now dual ESM+CJS via exports map)
- Internal `lib/compiler.js`, `lib/hidash.js`, `lib/kuery.js` — replaced by TypeScript source

## [0.6.0] — Previous

Legacy release. See git history for details.
