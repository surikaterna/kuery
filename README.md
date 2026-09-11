# Kuery

> MongoDB-style in-memory query engine — zero dependencies, TypeScript, ESM+CJS

## Purpose

Kuery is a zero-dependency query engine for filtering in-memory JavaScript collections using MongoDB-compatible query syntax. It compiles queries to optimized native closures, supports full TypeScript with type-safe dot-path queries, and ships dual ESM+CJS.

## Installation

```shell
npm i kuery
```

## Quick Start

```typescript
import Kuery from 'kuery';

const users = [
  { id: 1, name: 'Alice', age: 25, role: 'admin', address: { city: 'NYC' } },
  { id: 2, name: 'Bob', age: 17, role: 'user', address: { city: 'LA' } },
  { id: 3, name: 'Carol', age: 30, role: 'mod', address: { city: 'NYC' } },
];

const admins = new Kuery({ role: 'admin' }).find(users);
// [{ id: 1, name: 'Alice', ... }]

const page = new Kuery({ age: { $gte: 18 } })
  .sort({ name: 1 })
  .skip(0)
  .limit(10)
  .find(users);
// [{ id: 1, name: 'Alice', ... }, { id: 3, name: 'Carol', ... }]

// CJS (backward-compatible with v1)
const Kuery = require('kuery');
new Kuery({ id: 1 }).findOne(collection);
```

## Architecture

Kuery processes queries through a three-stage pipeline:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   compile   │────▶│     AST     │────▶│   execute   │
│  (query →   │     │  (ExprNode  │     │  (native    │
│   ExprNode) │     │   tree)     │     │   closures) │
└─────────────┘     └─────────────┘     └─────────────┘
```

1. **Compile** — A MongoDB-style query object is parsed into an `ExprNode` AST (abstract syntax tree). This is a pure data structure that can be inspected, serialized, or transformed.

2. **AST** — The intermediate representation uses three node kinds:
   - `literal` — constant values
   - `path` — dot-path field references
   - `op` — operator applications with child nodes

3. **Execute** — The AST is compiled into native JavaScript closures (`FilterFn`) that run without interpretation overhead. Path resolution handles array traversal, and operators are dispatched via direct function calls.

This design enables:
- **Pre-compilation**: compile once, filter millions of documents
- **AST inspection**: transform queries, extract diagnostics, build alternative backends
- **Custom operators**: extend the engine without modifying core code

## API Reference

### `Kuery` class

| Method | Description |
|--------|-------------|
| `new Kuery(query, options?)` | Create instance with a filter query |
| `.skip(n)` | Skip first `n` matched documents |
| `.limit(n)` | Limit results to `n` documents |
| `.sort(spec)` | Sort by keys (`1` = asc, `-1` = desc, supports dot-paths) |
| `.find(collection)` | Return all matching documents |
| `.findOne(collection)` | Return exactly one match or throw `KueryError` |
| `.test(document)` | Return `true` if document matches the query |

### Standalone functions

| Export | Signature | Description |
|--------|-----------|-------------|
| `compileFilter` | `(query, options?) => FilterFn` | Compile query to reusable native filter |
| `compile` | `(query) => ExprNode` | Compile query to inspectable AST |
| `evaluate` | `(ast, scope) => unknown` | Evaluate an AST against a document |
| `find` | `(collection, query, options?) => T[]` | Standalone collection find |
| `findOne` | `(collection, query) => T \| undefined` | Return first match (no uniqueness assertion) |

> **Note**: `Kuery.findOne()` asserts exactly one result (throws on 0 or 2+).
> The standalone `findOne()` from `kuery/collection` returns the first match or `undefined`.

### Error handling

```typescript
import { KueryError } from 'kuery';

try {
  new Kuery({ id: 99 }).findOne(users);
} catch (e) {
  if (e instanceof KueryError) {
    console.log(e.code); // 'KUERY_FIND_ONE'
  }
}
```

## Supported Operators

| Category | Operators |
|----------|-----------|
| Comparison | `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte` |
| Inclusion | `$in`, `$nin` |
| Logical | `$and`, `$or`, `$not`, `$nor` |
| Element | `$exists` |
| Array | `$elemMatch`, `$all`, `$size` |
| String | `$regex` (with `$options`) |

## TypeScript — Type-Safe Queries

Kuery ships `TypedQuery<T>` which provides autocomplete on dot-paths and validates operator values against field types:

```typescript
import { Kuery, type TypedQuery } from 'kuery';

interface User {
  name: string;
  age: number;
  role: 'admin' | 'user' | 'mod';
  active: boolean;
  address: {
    city: string;
    zip: string;
  };
  tags: string[];
}

// Autocomplete on field paths, type-checked operator values
const query: TypedQuery<User> = {
  age: { $gte: 18 },                          // ✓ number operator on number field
  role: { $in: ['admin', 'mod'] },             // ✓ array of valid role values
  'address.city': { $eq: 'Stockholm' },        // ✓ dot-path with string equality
  active: true,                                // ✓ implicit $eq
};

const results = new Kuery(query).find(users);  // results: User[]
```

### Extending TypedQuery with custom operators

If you register custom operators, you can make them type-safe via module augmentation:

```typescript
// my-operators.ts
declare module 'kuery' {
  interface CustomFieldOps<V> {
    /** Match documents where a field starts with a prefix (string fields only). */
    $startsWith?: V extends string ? string : never;
    /** Graph traversal operator (string ID fields only). */
    $inGraph?: V extends string ? { relation: string; rootId: string } : never;
  }
}

// Now TypedQuery understands your custom operators:
const query: TypedQuery<User> = {
  name: { $startsWith: 'Al' },  // ✓ type-safe custom operator
};
```

## Performance

v2 compiles queries to native closures instead of piping through lodash/fp. Benchmarks on a MacBook (100k documents):

| Query | v1 (lodash/fp) | v2 cold | v2 hot (pre-compiled) | Speedup |
|-------|---------------|---------|----------------------|---------|
| `{ status: 'active' }` | 2.37ms | 0.81ms | 0.64ms | **3.7×** |
| `{ status: 'active', score: { $gte: 50 } }` | 3.08ms | 1.63ms | 1.39ms | **2.2×** |
| `{ $or: [{ status: 'active' }, { role: 'admin' }] }` | 3.53ms | 1.86ms | 1.70ms | **2.1×** |
| `{ 'address.city': 'NYC' }` | 2.28ms | 1.09ms | 1.03ms | **2.2×** |
| `{ role: { $in: ['admin', 'mod', 'editor'] } }` | 1.36ms | 1.05ms | 0.86ms | **1.6×** |
| `{ name: { $regex: '^User_1' } }` | 1.84ms | 1.27ms | 1.26ms | **1.5×** |

**Cold** = `new Kuery(query).find(collection)` (compile + execute each call)
**Hot** = `compileFilter(query)` once, then `collection.filter(fn)` repeatedly

Pre-compiling filters is recommended for hot paths (event handlers, stream processing, repeated evaluations).

## Advanced Usage

### Strict generic expressions

The additive `kuery/expression` entry is independent of the Mongo-style query API. It validates an entire JSON AST, snapshots structurally immutable operator definitions and lookup, extracts opaque dependencies, and evaluates through a host resolver:

```typescript
import { compileExpression, standardV1, type ValueExpression } from 'kuery/expression';

const expression: ValueExpression = {
  kind: 'op',
  op: 'gte',
  args: [
    { kind: 'ref', ref: 'account.balance' },
    { kind: 'literal', value: 100 },
  ],
};

const compiled = compileExpression(expression, { profile: standardV1 });
if (compiled.ok) {
  console.log(compiled.value.dependencies); // ['account.balance']
  const result = compiled.value.evaluate((reference) =>
    reference === 'account.balance'
      ? { found: true, value: 125 }
      : { found: false },
  );
  // { ok: true, value: true }, or { ok: false, diagnostic: { code, path, message } }
}
```

Resolvers return `{ found: true, value }`, `{ found: false }`, or `{ found: false, reason: 'denied' }`; failures are code-first diagnostics and thrown values are not exposed. `standard-v1` is strict and non-coercing. Equality recursively compares JSON values (object key order is ignored; array order matters), comparisons require two numbers or two strings, and arithmetic accepts finite numbers only. `and` and `or` stop at the decisive boolean; `coalesce` skips missing outcomes (including from nested expressions) and `null`; `exists` converts a found/missing nested outcome to a boolean. Dependencies always list every static reference, so capability-aware hosts should authorize `dependencies` before evaluation when all potential references require authorization.

Standard operator names are `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `and`, `or`, `not`, `in`, `nin`, `exists`, `coalesce`, `add`, `sub`, `mul`, and `div`.

Custom trusted synchronous operators use an isolated structurally immutable profile rather than the legacy global query registry. Profile names are stable ASCII identifiers of at most 128 characters and must match `[A-Za-z][A-Za-z0-9._:/@-]*`:

```typescript
import { ExpressionProfileBuilder } from 'kuery/expression';

const profile = new ExpressionProfileBuilder('my-app')
  .add({
    name: 'my-app:double',
    arity: 1,
    inputTypes: ['number'],
    resultType: 'number',
    execute: ([value]) => (value as number) * 2,
  })
  .build();
```

Extend an existing profile when custom operators must retain its complete evaluation semantics. `extend` carries forward built-in lazy behavior without exposing strategy internals or copying handlers:

```typescript
const arbitreV1 = standardV1.extend('arbitre-v1', [{
  name: 'arbitre:score',
  arity: 1,
  inputTypes: ['number'],
  resultType: 'number',
  execute: ([value]) => value as number,
}]);
```

Extensions only accept new namespaced operators. Existing names cannot be replaced, chained extensions retain inherited semantics, and both the base and result remain independent structurally immutable profiles. `definitions` remains a frozen metadata view for inspection and schema tooling; reconstructing a profile with `new ExpressionProfile(name, profile.definitions)` is not composition and intentionally does not transfer internal evaluation strategies. Use `profile.extend(...)` instead.

Profile immutability covers copied operator metadata, definitions, lookup, and callback identity. JavaScript cannot snapshot or deep-freeze a function's closure or function-object properties without changing its semantics. Operator handlers and resolvers are therefore trusted host callbacks: producers must keep their external state pure/deterministic for the lifetime of a profile.

Ordinary same- or cross-realm native Promise results, including rejections, are consumed and reported as `EXPRESSION_ASYNC_UNSUPPORTED`. Suspicious Promise shapes—subclasses, own `constructor`/`then`/`Symbol.species` properties, or altered prototypes—are rejected without reading user-controlled getters or invoking thenables. Kuery does not mutate these objects and cannot take ownership of a rejection that the producer created before returning a suspicious Promise; producers must pre-handle such rejections. Untrusted expression AST and JSON values never invoke this async detector: non-plain objects, including Promises, are rejected structurally without reading their properties.

`getStandardExpressionJsonSchema()` returns the strict `standard-v1` Draft 2020-12 schema; `generateExpressionJsonSchema(profile)` derives the equivalent schema from a custom profile's operator names and arities. Schemas use closed node objects, a maximum of 32 operator arguments, recursive JSON-only literals, and the default string reference representation; custom reference codecs remain a runtime boundary and require host-owned schema adaptation.

Reference objects can be generic JSON when supplied with a caller-owned `reference.validate` guard and optional canonicalizer. See [ADR 0001](docs/adr/0001-standard-expression-core.md) for trust boundaries, diagnostics, ownership, and compatibility. The ADR is included in the published package. This API does not add a parser or language tooling.

### Pre-compiled filters

```typescript
import { compileFilter } from 'kuery/filter';

const isEligible = compileFilter<User>({ age: { $gte: 18 }, active: true });

// Reuse across millions of evaluations
stream.filter(isEligible);
events.filter(isEligible);
```

### Custom operators

```typescript
import { Kuery, OperatorRegistry } from 'kuery';

const registry = new OperatorRegistry();
registry.register(
  { name: '$between', arity: 2 },
  (args) => {
    const [value, [min, max]] = args;
    return typeof value === 'number' && value >= min && value <= max;
  }
);

const q = new Kuery({ score: { $between: [10, 50] } }, { registry });
```

### Failure tracing / diagnostics

```typescript
import { compile } from 'kuery/compile';
import { evaluateWithTrace } from 'kuery/trace';

const ast = compile({ age: { $gte: 18 }, role: 'admin' });
const { result, traces } = evaluateWithTrace(ast, { age: 15, role: 'user' });
// traces: [{ path: 'age', operator: '$gte', expected: 18, actual: 15 }, ...]
```

### Sub-path imports

For tree-shaking or when you only need specific functionality:

```typescript
import { compileFilter } from 'kuery/filter';
import { compile } from 'kuery/compile';
import { evaluate } from 'kuery/evaluate';
import { OperatorRegistry } from 'kuery/operators';
import { KueryError } from 'kuery/errors';
import { find, findOne } from 'kuery/collection';
import { compileExpression, standardV1 } from 'kuery/expression';
```

## Migrating from v1

### Breaking Changes

1. **`$exists` checks key presence, not truthiness**
   - v1: `{ field: { $exists: true } }` matched if `!!doc.field` was truthy
   - v2: matches if the key exists at all (even if value is `null`, `0`, `""`, `false`)
   - Migration: use `{ field: { $ne: null } }` if you need truthiness semantics

2. **Array fields now match element-wise** (MongoDB-compatible)
   - v1: `{ tags: { $in: ['a'] } }` on `{ tags: ['a','b'] }` → no match
   - v2: matches if any array element satisfies the condition

3. **Falsy values in dot-path traversal** (bugfix)
   - v1: `{ 'items.score': 0 }` silently failed for `score: 0` inside arrays
   - v2: correctly matches

4. **Error type: `KueryError` replaces generic `Error`**
   - `findOne` throws `KueryError` with a `.code` property
   - `instanceof Error` still true; existing catch handlers work

5. **lodash removed** — zero runtime dependencies

### Non-Breaking Additions

- TypeScript types with `TypedQuery<T>` and dot-path autocomplete
- ESM + CJS dual format
- New operators: `$nor`, `$all`, `$size`
- Custom operator registry with type-safe augmentation
- Pre-compiled filter functions (1.5–3.7× faster)
- Prototype pollution protection
- Failure trace diagnostics

## License

ISC
