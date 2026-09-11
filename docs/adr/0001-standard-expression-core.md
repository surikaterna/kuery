# ADR 0001: Standard expression core

- Status: Accepted
- Date: 2026-09-11
- Issue: Kuery #33

## Context

Kuery v2 has a query frontend, an `ExprNode` query AST, a mutable `OperatorRegistry`, and query-oriented compile/evaluate paths. Formbar and a future Arbitre refactor need a smaller shared contract for safe, host-resolved value expressions. Reusing or extending `ExprNode` would break exhaustive consumers and would couple reference authorization to Kuery's document-path semantics.

## Decision

Kuery owns an additive expression core at `kuery/expression`. Its canonical `ValueExpression<R>` has literal, reference, and operator nodes. `R` is opaque JSON selected by the host. Unknown input is copied through own data descriptors into deeply frozen canonical JSON. Accessors, sparse arrays, executable/non-finite values, unsafe keys, cycles, non-plain objects, malformed nodes, and configured depth/node/argument/string bounds are rejected with fixed code-first diagnostics.

The caller supplies a reference validator and optional canonicalizer for non-string reference forms. The default reference is a non-empty bounded string. Canonical JSON serialization supplies deterministic structural equality for stable first-seen dependency extraction.

`ExpressionProfile` is a structurally immutable snapshot, separate from the legacy mutable `OperatorRegistry`. It copies and freezes declaration metadata, lookup, definition lists, and callback identity. Profile names are bounded stable ASCII identifiers matching `[A-Za-z][A-Za-z0-9._:/@-]{0,127}`. A builder rejects duplicate operators. Custom operators use namespaced names such as `app:distance`, and are trusted, pure, synchronous host functions; functions are never part of serialized expressions. JavaScript cannot snapshot a callback's closure or its own mutable properties without changing callback semantics, so that state remains producer-owned and must remain deterministic for the profile lifetime. Callback throws and invalid values are contained, but callbacks and proxies are not sandboxed. Proxy/descriptor trap failures are rejected without exposing thrown values.

`profile.extend(name, definitions)` is the supported composition path. It snapshots the base profile's complete operator records, including opaque evaluation strategies, then adds distinct namespaced definitions. Existing operators cannot be replaced, and chained extensions preserve inherited semantics. Base and result remain independent and frozen. The public `definitions` array is an immutable metadata/handler view, not a strategy-bearing serialization format; passing it to the public constructor does not compose profiles or transfer internal lazy behavior.

Ordinary safe same- or cross-realm native Promise callback results are consumed and diagnosed as asynchronous. Suspicious Promise shapes (including own constructor/then/species properties, subclasses, and altered prototypes) are rejected without invoking user-controlled getters or thenables. Kuery does not mutate them and cannot adopt a pre-existing rejection without traversing that hostile surface, so the trusted callback producer owns pre-handling such rejections. Untrusted AST/JSON input takes a separate structural path: Promise and other non-plain objects are rejected without async detection or property access.

`standard-v1` provides strict `eq`/`neq`, same-type number/string comparisons, boolean `and`/`or`/`not`, structural `in`/`nin`, `exists`, `coalesce`, exact-arity lazy `if`, and exact-arity finite `add`/`sub`/`mul`/`div`. `if` requires a primitive boolean condition, evaluates only its selected arbitrary-JSON branch, and propagates missing/denied outcomes from the condition or selected branch. Its unselected branch consumes no resolver, operator, or evaluation-step budget, though both branches remain canonicalized and statically listed as dependencies. Equality is scalar identity plus recursive structural JSON equality: array order matters and object key order does not. There is no coercion. Division rejects both signs of zero; all non-finite arithmetic results are diagnostics.

`compileExpression` validates the whole AST and operator arity before returning an immutable program. `dependencies` is static and does not imply reads. Evaluation is synchronous and short-circuits `and`, `or`, `coalesce`, `exists`, and `if`; missing propagates through eager nested operators so an outer `exists` or `coalesce` can observe it, while denied always remains an error. Lazy traversal is an internal standard-profile capability. Custom operators retain the eager `execute(args)` contract; no public arbitrary strategy or traversal hook is exposed. Hosts that authorize all potential references must authorize the complete dependency list before calling `evaluate`; Kuery deliberately does not encode capabilities or namespaces. A resolver explicitly reports found, missing, or denied, and resolver failures become fixed diagnostics.

`generateExpressionJsonSchema(profile)` derives strict Draft 2020-12 operator alternatives from the supplied profile's public names and exact/minimum/maximum arity. Node objects are closed and arguments are globally capped at 32. The schema models plain JSON literals and the default string-reference codec. Executable values and accessors are impossible in JSON; custom reference codecs require a host-specific schema adaptation and remain runtime-validated.

Evaluation uses a bounded step count. Resolver and operator values are copied through the same bounded JSON boundary, preventing mutable results from entering the computation.

## Compatibility and ownership

This API is additive. Existing `ExprNode`, `compile`, `evaluate`, `compileFilter`, path behavior, and `OperatorRegistry` remain unchanged. The existing filter compiler's global wiring and circular initialization are not reused.

The expression core owns the AST boundary, profiles, compilation, diagnostics, dependencies, and generic resolver protocol. The Mongo-inspired query frontend remains a separate adapter and is not a compatibility promise for this expression language. Formbar owns namespaces, authorization, capabilities, observations, and lifecycle. Arbitre owns rule scheduling and truth maintenance. Neither product concept belongs in Kuery's expression core.

## Consequences and extraction triggers

The API is intentionally a programmatic JSON AST, not a parser or declarative language. Parser/CST support, source spans, formatting, editor services, LSP, and query lowering are future tooling. If multiple independent packages require release cadence or language tooling separate from Kuery, the core may be extracted while preserving this subpath contract.
