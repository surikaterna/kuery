# Kuery

> MongoDB-style in-memory query engine for JavaScript/TypeScript

<!-- badges placeholder -->

## Purpose

Kuery is a zero-dependency, MongoDB-compatible query engine for filtering in-memory collections. It supports ESM and CJS, ships TypeScript declarations, and provides both a fluent class API and standalone functions.

## Installation

```shell
npm i kuery
```

## Quick Start

```typescript
import Kuery from 'kuery';
// or
import { Kuery, compileFilter } from 'kuery';

const users = [
  { id: 1, name: 'Alice', age: 25, role: 'admin' },
  { id: 2, name: 'Bob', age: 17, role: 'user' },
  { id: 3, name: 'Carol', age: 30, role: 'mod' },
];

// Basic usage
const q = new Kuery({ status: 'active', age: { $gte: 18 } });
const results = q.find(users);

// With skip/limit/sort
const page = new Kuery({ role: 'admin' })
  .sort({ name: 1 })
  .skip(20)
  .limit(10)
  .find(users);

// Pre-compiled filter (hot path)
import { compileFilter } from 'kuery/filter';
const isActive = compileFilter({ age: { $gte: 18 } });
const adults = users.filter(isActive);

// CJS (backward-compatible)
const Kuery = require('kuery');
new Kuery({ id: 1 }).findOne(collection);
```

## API Reference

### `Kuery` class

| Method | Description |
|--------|-------------|
| `new Kuery(query)` | Create instance with a filter query |
| `.skip(n)` | Skip first `n` matched documents |
| `.limit(n)` | Limit results to `n` documents |
| `.sort(spec)` | Sort by keys (`1` = asc, `-1` = desc) |
| `.find(collection)` | Return all matching documents |
| `.findOne(collection)` | Return exactly one match or throw `KueryError` |
| `.test(document)` | Return `true` if document matches the query |

### Standalone functions

| Export | Signature | Description |
|--------|-----------|-------------|
| `compileFilter` | `(query, options?) => (doc) => boolean` | Compile query to reusable filter function |
| `compile` | `(query) => AST` | Compile query to inspectable AST |
| `evaluate` | `(ast, scope) => boolean` | Evaluate AST against a document |
| `find` | `(collection, query, options?) => T[]` | Standalone collection find |
| `findOne` | `(collection, query, options?) => T \| undefined` | Return first match or `undefined` |

### Classes & Types

| Export | Description |
|--------|-------------|
| `KueryError` | Typed error class with `.code` property |
| `OperatorRegistry` | Register and use custom operators |
| `TypedQuery<T>` | Type-safe query with dot-path autocomplete |

## Supported Operators

| Category | Operators |
|----------|-----------|
| Comparison | `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte` |
| Inclusion | `$in`, `$nin` |
| Logical | `$and`, `$or`, `$not`, `$nor` |
| Element | `$exists` |
| Array | `$elemMatch`, `$all`, `$size` |
| String | `$regex` (with `$options`) |

## TypeScript

```typescript
import type { TypedQuery } from 'kuery';

interface User {
  name: string;
  age: number;
  role: string;
  address: { city: string };
}

// Full autocomplete on field paths and operator values
const query: TypedQuery<User> = {
  age: { $gte: 18 },
  role: { $in: ['admin', 'mod'] },
  'address.city': { $eq: 'Stockholm' },
};
```

## Advanced Usage

### Pre-compiled filters

Compile once, reuse across many evaluations for performance-critical paths:

```typescript
import { compileFilter } from 'kuery/filter';

const isEligible = compileFilter({ age: { $gte: 18 }, status: 'active' });

// Use in hot loops, streams, etc.
stream.filter(isEligible);
```

### Custom operators

```typescript
import { OperatorRegistry } from 'kuery/operators';

const registry = new OperatorRegistry();
registry.register('$startsWith', (fieldValue, operand) => {
  return typeof fieldValue === 'string' && fieldValue.startsWith(operand);
});
```

### Failure tracing / diagnostics

```typescript
import { compile } from 'kuery/compile';
import { evaluateWithTrace } from 'kuery/trace';

const ast = compile({ age: { $gte: 18 }, role: 'admin' });
const { result, trace } = evaluateWithTrace(ast, { age: 15, role: 'admin' });
// trace shows which conditions failed and why
```

### Sub-path imports

```typescript
import { compileFilter } from 'kuery/filter';
import { compile } from 'kuery/compile';
import { evaluate } from 'kuery/evaluate';
import { OperatorRegistry } from 'kuery/operators';
import { KueryError } from 'kuery/errors';
import { find, findOne } from 'kuery/collection';
```

## Migrating from v1

### Breaking Changes

1. **`$exists` checks key presence, not truthiness**
   - v1: `{ field: { $exists: true } }` matched if `!!doc.field` was truthy
   - v2: matches if the key exists at all (even if value is `null`, `0`, `""`, `false`)
   - Migration: replace `{ field: { $exists: true } }` with `{ field: { $ne: null } }` if you want truthiness behavior

2. **Array fields now match element-wise**
   - v1: `{ tags: { $in: ['a'] } }` on `{ tags: ['a','b'] }` → no match
   - v2: matches (checks if any element of the array is in the list) — MongoDB-compatible
   - This is a bugfix; most consumers will see improved results

3. **Falsy values in dot-path traversal**
   - v1: `{ 'items.score': 0 }` would not match documents with `score: 0` inside arrays
   - v2: correctly matches — was a bug in v1's `_collect` function

4. **Error type: `KueryError` replaces generic `Error`**
   - `findOne` now throws `KueryError` (extends `Error`) with a `.code` property
   - Existing `catch(e)` still works; `instanceof Error` still true

5. **Type-mismatched comparisons return `false`**
   - Both v1 and v2 return no match for cross-type `$gt`/`$gte`/`$lt`/`$lte`
   - Behavior is the same, but v2 is explicit about it

### Non-Breaking Additions

- TypeScript types included
- ESM + CJS dual format
- New operators: `$nor`, `$all`, `$size`
- Custom operator registry
- Pre-compiled filter functions
- Prototype pollution protection
- Zero dependencies (lodash removed)

## License

ISC
