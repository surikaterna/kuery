import { describe, expect, test } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import { runInNewContext } from "node:vm";
import {
  canonicalizeExpression,
  compileExpression,
  ExpressionProfile,
  ExpressionProfileBuilder,
  extractExpressionDependencies,
  generateExpressionJsonSchema,
  getStandardExpressionJsonSchema,
  standardV1,
  type JsonValue,
  type ValueExpression,
} from "../index.js";

const literal = (value: JsonValue): ValueExpression => ({ kind: "literal", value });
const ref = (value: string): ValueExpression => ({ kind: "ref", ref: value });
const op = (name: string, ...args: ValueExpression[]): ValueExpression => ({ kind: "op", op: name, args });

describe("strict expression canonicalization", () => {
  test("canonicalizes and deeply freezes finite JSON object literals", () => {
    const result = canonicalizeExpression({ kind: "literal", value: { z: [1, null], a: true } });
    expect(result).toEqual({ ok: true, value: { kind: "literal", value: { a: true, z: [1, null] } } });
    if (result.ok) {
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.kind === "literal" && result.value.value)).toBe(true);
    }
  });

  test.each([
    ["unknown kind", { kind: "wat" }],
    ["extra keys", { kind: "literal", value: 1, extra: true }],
    ["function", { kind: "literal", value: () => 1 }],
    ["nonfinite", { kind: "literal", value: Number.POSITIVE_INFINITY }],
    ["date", { kind: "literal", value: new Date() }],
    ["unsafe key", { kind: "literal", value: Object.defineProperty({}, "constructor", { value: 1, enumerable: true }) }],
  ])("rejects %s", (_name, input) => {
    expect(canonicalizeExpression(input)).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_INVALID_INPUT" } });
  });

  test("rejects accessors without invoking them", () => {
    let invoked = false;
    const input = Object.defineProperty({ kind: "literal" }, "value", {
      enumerable: true,
      get() { invoked = true; return 1; },
    });
    expect(canonicalizeExpression(input)).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_INVALID_INPUT" } });
    expect(invoked).toBe(false);
  });

  test("rejects Promise AST values structurally without async property access", () => {
    const promise = Promise.resolve(1);
    let getterCalls = 0;
    Object.defineProperty(promise, "constructor", { get() { getterCalls += 1; throw new Error("secret"); } });
    expect(canonicalizeExpression({ kind: "literal", value: promise })).toMatchObject({
      ok: false,
      diagnostic: { code: "EXPRESSION_INVALID_INPUT" },
    });
    expect(getterCalls).toBe(0);
  });

  test("rejects sparse arrays, cycles, and throwing proxies", () => {
    const sparse = Array(1);
    const cyclic: Record<string, unknown> = { kind: "literal" };
    cyclic.value = cyclic;
    const proxy = new Proxy({}, { ownKeys() { throw new Error("secret"); } });
    for (const input of [
      { kind: "literal", value: sparse },
      cyclic,
      proxy,
    ]) {
      const result = canonicalizeExpression(input);
      expect(result).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_INVALID_INPUT" } });
      if (!result.ok) expect(result.diagnostic.message).not.toContain("secret");
    }
  });

  test("rejects over-wide objects before reading their descriptors", () => {
    let descriptorReads = 0;
    const value = new Proxy(
      Object.fromEntries(Array.from({ length: 100 }, (_, index) => [`key${index}`, index])),
      { getOwnPropertyDescriptor(target, key) { descriptorReads += 1; return Reflect.getOwnPropertyDescriptor(target, key); } },
    );
    expect(canonicalizeExpression({ kind: "literal", value }, { limits: { maxNodes: 3 } })).toMatchObject({
      ok: false,
      diagnostic: { code: "EXPRESSION_LIMIT_EXCEEDED" },
    });
    expect(descriptorReads).toBe(0);
  });

  test.each(["literal", "operator"])("rejects over-budget %s arrays before traps or allocation", (kind) => {
    let ownKeyReads = 0;
    let descriptorReads = 0;
    const values = kind === "literal"
      ? Array.from({ length: 32 }, () => true)
      : Array.from({ length: 32 }, () => literal(true));
    const array = new Proxy(values, {
      ownKeys(target) { ownKeyReads += 1; return Reflect.ownKeys(target); },
      getOwnPropertyDescriptor(target, key) {
        descriptorReads += 1;
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    const input = kind === "literal" ? { kind: "literal", value: array } : { kind: "op", op: "and", args: array };
    expect(canonicalizeExpression(input, { limits: { maxNodes: 2 } })).toMatchObject({
      ok: false,
      diagnostic: { code: "EXPRESSION_LIMIT_EXCEEDED" },
    });
    expect({ ownKeyReads, descriptorReads }).toEqual({ ownKeyReads: 0, descriptorReads: 0 });
  });

  test("enforces depth, node, argument, string, and default reference limits", () => {
    const cases: readonly [unknown, object][] = [
      [op("not", op("not", literal(true))), { limits: { maxDepth: 1 } }],
      [op("and", literal(true), literal(true)), { limits: { maxNodes: 2 } }],
      [op("and", literal(true), literal(true)), { limits: { maxArgs: 1 } }],
      [literal("long"), { limits: { maxStringLength: 3 } }],
      [ref("long"), { limits: { maxReferenceLength: 3 } }],
    ];
    for (const [input, options] of cases) {
      expect(canonicalizeExpression(input, options)).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_LIMIT_EXCEEDED" } });
    }
  });

  test("uses a caller reference guard and canonicalizer", () => {
    type AppRef = { readonly id: string };
    const result = canonicalizeExpression<AppRef>({ kind: "ref", ref: { id: " A " } }, {
      reference: {
        validate: (value): value is AppRef => typeof value === "object" && value !== null && "id" in value,
        canonicalize: (value) => ({ id: value.id.trim().toLowerCase() }),
      },
    });
    expect(result).toEqual({ ok: true, value: { kind: "ref", ref: { id: "a" } } });
  });

  test("rejects invalid or throwing reference callbacks without leaking details", () => {
    const invalid = canonicalizeExpression({ kind: "ref", ref: "x" }, { reference: { validate: () => false } });
    const throwing = canonicalizeExpression({ kind: "ref", ref: "x" }, { reference: { validate: () => { throw new Error("secret"); } } });
    expect(invalid).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_INVALID_REFERENCE" } });
    expect(throwing).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_INVALID_REFERENCE" } });
    if (!throwing.ok) expect(throwing.diagnostic.message).not.toContain("secret");
  });

  test("does not expose accessor-backed references to the caller guard", () => {
    let invoked = false;
    const value = Object.defineProperty({}, "id", {
      enumerable: true,
      get() { invoked = true; return "x"; },
    });
    const result = canonicalizeExpression({ kind: "ref", ref: value }, {
      reference: { validate: (_input): _input is { readonly id: string } => true },
    });
    expect(result).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_INVALID_REFERENCE" } });
    expect(invoked).toBe(false);
  });
});

describe("standard-v1 profile", () => {
  function evaluate(expression: ValueExpression, resolver = () => ({ found: false as const })) {
    const compiled = compileExpression(expression, { profile: standardV1 });
    expect(compiled.ok).toBe(true);
    return compiled.ok ? compiled.value.evaluate(resolver) : compiled;
  }

  test.each([
    ["eq", { a: [1, { b: true }] }, { b: 0 }, false],
    ["eq", { a: [1, { b: true }] }, { a: [1, { b: true }] }, true],
    ["neq", 1, "1", true],
    ["gt", "b", "a", true],
    ["lte", 2, 2, true],
    ["in", { x: 1 }, [{ x: 1 }], true],
    ["nin", null, [1, 2], true],
  ])("evaluates strict %s", (name, left, right, expected) => {
    expect(evaluate(op(name, literal(left as JsonValue), literal(right as JsonValue)))).toEqual({ ok: true, value: expected });
  });

  test("rejects mixed comparison types and invalid membership", () => {
    expect(evaluate(op("gt", literal(2), literal("1")))).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_TYPE_MISMATCH" } });
    expect(evaluate(op("in", literal(2), literal(2)))).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_TYPE_MISMATCH" } });
  });

  test.each([
    ["add", 4, 2, 6],
    ["sub", 4, 2, 2],
    ["mul", 4, 2, 8],
    ["div", 4, 2, 2],
  ])("evaluates finite %s", (name, left, right, expected) => {
    expect(evaluate(op(name, literal(left), literal(right)))).toEqual({ ok: true, value: expected });
  });

  test("diagnoses division by either zero and non-finite arithmetic", () => {
    for (const zero of [0, -0]) {
      expect(evaluate(op("div", literal(1), literal(zero)))).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_DIVISION_BY_ZERO" } });
    }
    expect(evaluate(op("mul", literal(Number.MAX_VALUE), literal(2)))).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_NON_FINITE_RESULT" } });
  });

  test("validates exact, minimum, and maximum arity during compilation", () => {
    expect(compileExpression(op("not", literal(true), literal(false)), { profile: standardV1 })).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_INVALID_ARITY" } });
    expect(compileExpression(op("and"), { profile: standardV1 })).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_INVALID_ARITY" } });
    const profile = new ExpressionProfileBuilder("bounded").add({ name: "app:pick", minArgs: 1, maxArgs: 2, execute: ([first]) => first! }).build();
    expect(compileExpression(op("app:pick", literal(1), literal(2), literal(3)), { profile })).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_INVALID_ARITY" } });
  });

  test("rejects unknown operators at compile time", () => {
    expect(compileExpression(op("unknown"), { profile: standardV1 })).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_UNKNOWN_OPERATOR", path: ["op"] } });
  });
});

describe("compiled expression", () => {
  test("extracts stable structural dependencies and resolves every reference occurrence", () => {
    const expression = op("add", ref("score"), op("coalesce", ref("score"), ref("fallback")));
    const compiled = compileExpression(expression, { profile: standardV1 });
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    expect(compiled.value.dependencies).toEqual(["score", "fallback"]);
    expect(Object.isFrozen(compiled.value.dependencies)).toBe(true);
    let calls = 0;
    expect(compiled.value.evaluate((reference) => {
      calls += 1;
      return { found: true, value: reference === "score" ? 2 : 0 };
    })).toEqual({ ok: true, value: 4 });
    expect(calls).toBe(2);
  });

  test("public extraction deduplicates object references structurally", () => {
    type AppRef = { readonly id: string };
    const expression: ValueExpression<AppRef> = {
      kind: "op", op: "eq", args: [{ kind: "ref", ref: { id: "a" } }, { kind: "ref", ref: { id: "a" } }],
    };
    const reference = {
      validate: (value: unknown): value is AppRef => typeof value === "object" && value !== null && "id" in value,
    };
    const canonical = canonicalizeExpression<AppRef>(expression, { reference });
    expect(canonical.ok && extractExpressionDependencies<AppRef>(canonical.value, { reference })).toEqual({ ok: true, value: [{ id: "a" }] });
  });

  test("distinguishes missing from present null and supports exists/coalesce", () => {
    const resolve = (name: string) => name === "present" ? { found: true as const, value: null } : { found: false as const };
    const exists = compileExpression(op("exists", ref("present")), { profile: standardV1 });
    const missing = compileExpression(ref("missing"), { profile: standardV1 });
    const fallback = compileExpression(op("coalesce", ref("missing"), literal(7)), { profile: standardV1 });
    expect(exists.ok && exists.value.evaluate(resolve)).toEqual({ ok: true, value: true });
    expect(missing.ok && missing.value.evaluate(resolve)).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_REFERENCE_MISSING" } });
    expect(fallback.ok && fallback.value.evaluate(resolve)).toEqual({ ok: true, value: 7 });
  });

  test("composes exists and coalesce around nested expressions that encounter missing", () => {
    const resolve = () => ({ found: false as const });
    const nested = op("add", ref("missing"), literal(1));
    const exists = compileExpression(op("exists", nested), { profile: standardV1 });
    const fallback = compileExpression(op("coalesce", nested, literal(7)), { profile: standardV1 });
    expect(exists.ok && exists.value.evaluate(resolve)).toEqual({ ok: true, value: false });
    expect(fallback.ok && fallback.value.evaluate(resolve)).toEqual({ ok: true, value: 7 });
  });

  test("accepts the typed explicit undefined missing reason", () => {
    const compiled = compileExpression(ref("missing"), { profile: standardV1 });
    expect(compiled.ok && compiled.value.evaluate(() => ({ found: false, reason: undefined }))).toMatchObject({
      ok: false,
      diagnostic: { code: "EXPRESSION_REFERENCE_MISSING" },
    });
  });

  test("distinguishes denied references without treating them as missing", () => {
    const compiled = compileExpression(op("coalesce", ref("denied"), literal(7)), { profile: standardV1 });
    expect(compiled.ok && compiled.value.evaluate(() => ({ found: false, reason: "denied" }))).toMatchObject({
      ok: false,
      diagnostic: { code: "EXPRESSION_REFERENCE_DENIED", path: ["args", 0] },
    });
  });

  test("short-circuits logical and coalesce evaluation while dependencies remain static", () => {
    const compiled = compileExpression(op("and", literal(false), ref("not-read")), { profile: standardV1 });
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    expect(compiled.value.dependencies).toEqual(["not-read"]);
    expect(compiled.value.evaluate(() => { throw new Error("must not run"); })).toEqual({ ok: true, value: false });
  });

  test("contains resolver throws, malformed results, async results, and invalid values", () => {
    const compiled = compileExpression(ref("x"), { profile: standardV1 });
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    expect(compiled.value.evaluate(() => { throw new Error("secret"); })).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_REFERENCE_ERROR" } });
    expect(compiled.value.evaluate(() => ({ found: true } as never))).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_REFERENCE_ERROR" } });
    expect(compiled.value.evaluate((() => Promise.resolve({ found: true, value: 1 })) as never)).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_ASYNC_UNSUPPORTED" } });
    expect(compiled.value.evaluate(() => ({ found: true, value: undefined as never }))).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_INVALID_RESULT" } });
  });

  test("rejects native Promises even when their catch property is hostile", () => {
    const compiled = compileExpression(ref("x"), { profile: standardV1 });
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    const promise = Promise.resolve({ found: true, value: 1 });
    Object.defineProperty(promise, "catch", { get() { throw new Error("secret"); } });
    expect(compiled.value.evaluate((() => promise) as never)).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_ASYNC_UNSUPPORTED" } });
  });

  test.each(["resolver", "operator"])("rejects suspicious pre-handled Promise from %s without property access", async (source) => {
    const promise = Promise.reject(new Error("secret rejection"));
    await promise.catch(() => undefined);
    let getterCalls = 0;
    Object.defineProperty(promise, "constructor", { get() { getterCalls += 1; throw new Error("poisoned"); } });
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    try {
      const compiled = source === "resolver"
        ? compileExpression(ref("x"), { profile: standardV1 })
        : compileExpression(op("app:promise"), {
          profile: new ExpressionProfileBuilder("app")
            .add({ name: "app:promise", arity: 0, execute: () => promise as never })
            .build(),
        });
      expect(compiled.ok && compiled.value.evaluate(() => promise as never)).toMatchObject({
        ok: false,
        diagnostic: { code: "EXPRESSION_ASYNC_UNSUPPORTED" },
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(getterCalls).toBe(0);
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  test.each(["same realm", "cross realm"])("consumes ordinary rejected %s Promise results", async (realm) => {
    const promise: Promise<unknown> = realm === "same realm"
      ? Promise.reject(new Error("secret rejection"))
      : runInNewContext("Promise.reject(new Error('secret rejection'))");
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    try {
      const compiled = compileExpression(ref("x"), { profile: standardV1 });
      expect(compiled.ok && compiled.value.evaluate(() => promise as never)).toMatchObject({
        ok: false,
        diagnostic: { code: "EXPRESSION_ASYNC_UNSUPPORTED" },
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  test("rejects accessor-backed and trap-throwing resolver results without invoking accessors", () => {
    const compiled = compileExpression(ref("x"), { profile: standardV1 });
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    let invoked = false;
    const accessor = Object.defineProperty({ found: true }, "value", {
      enumerable: true,
      get() { invoked = true; return 1; },
    });
    const proxy = new Proxy({}, { getOwnPropertyDescriptor() { throw new Error("secret"); } });
    expect(compiled.value.evaluate(() => accessor as never)).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_REFERENCE_ERROR" } });
    expect(compiled.value.evaluate(() => proxy as never)).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_REFERENCE_ERROR" } });
    expect(invoked).toBe(false);
  });

  test("enforces evaluation cost", () => {
    const compiled = compileExpression(op("add", literal(1), literal(2)), { profile: standardV1, limits: { maxEvaluationSteps: 2 } });
    expect(compiled.ok && compiled.value.evaluate(() => ({ found: false }))).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_EVALUATION_LIMIT" } });
  });
});

describe("custom structurally immutable profiles", () => {
  test("supports namespaced pure operators and immutable independent snapshots", () => {
    const builder = new ExpressionProfileBuilder("app");
      builder.add({ name: "app:double", arity: 1, inputTypes: ["number"], resultType: "number", execute: ([value]) => (value as number) * 2 });
    const first = builder.build();
    builder.add({ name: "app:constant", arity: 0, execute: () => 1 });
    expect(first.has("app:constant")).toBe(false);
    expect(Object.isFrozen(first)).toBe(true);
    expect(compileExpression(op("app:double", literal(3)), { profile: first })).toMatchObject({ ok: true });
  });

  test("validates bounded ASCII profile names used in schema identifiers", () => {
    const definition = { name: "app:value", arity: 0, execute: () => null };
    expect(new ExpressionProfile("app:a.b/c-d@v1", [definition]).name).toBe("app:a.b/c-d@v1");
    for (const name of ["", "1app", "bad name", "\ud800", `a${"x".repeat(128)}`]) {
      expect(() => new ExpressionProfile(name, [definition])).toThrow(TypeError);
      expect(() => new ExpressionProfileBuilder(name)).toThrow(TypeError);
    }
    const schema = generateExpressionJsonSchema(new ExpressionProfile("app:a.b/c-d@v1", [definition])) as any;
    expect(schema.$id).toBe("https://kuery.dev/schema/expression/app%3Aa.b%2Fc-d%40v1");
  });

  test("keeps custom built-in-named handlers eager instead of substituting standard semantics", () => {
    let calls = 0;
    const profile = new ExpressionProfile("custom", [{
      name: "and",
      arity: 1,
      execute: () => { calls += 1; return "custom"; },
    }]);
    const compiled = compileExpression(op("and", literal(true)), { profile });
    expect(compiled.ok && compiled.value.evaluate(() => ({ found: false }))).toEqual({ ok: true, value: "custom" });
    expect(calls).toBe(1);
  });

  test("defines structural immutability and treats callback state as producer-owned", () => {
    const handler = Object.assign(function handler() { return handler.delta; }, { delta: 1 });
    const profile = new ExpressionProfileBuilder("app")
      .add({ name: "app:value", arity: 0, execute: handler })
      .build();
    expect(Object.isFrozen(profile.get("app:value"))).toBe(true);
    expect(profile.get("app:value")?.execute).toBe(handler);
    handler.delta = 100;
    expect(profile.get("app:value")?.execute).toBe(handler);
    const compiled = compileExpression(op("app:value"), { profile });
    expect(compiled.ok && compiled.value.evaluate(() => ({ found: false }))).toEqual({ ok: true, value: 100 });
  });

  test("rejects duplicate operators and invalid unnamespaced custom names", () => {
    const builder = new ExpressionProfileBuilder("app").add({ name: "app:x", arity: 0, execute: () => null });
    expect(() => builder.add({ name: "app:x", arity: 0, execute: () => null })).toThrow(/Duplicate/);
    expect(() => builder.add({ name: "plain", arity: 0, execute: () => null })).toThrow(TypeError);
  });

  test("contains throwing, asynchronous, and invalid custom operator results", () => {
    const profile = new ExpressionProfileBuilder("app")
      .add({ name: "app:throw", arity: 0, execute: () => { throw new Error("secret"); } })
      .add({ name: "app:async", arity: 0, execute: (() => Promise.resolve(1)) as never })
      .add({ name: "app:bad", arity: 0, execute: () => undefined as never })
      .build();
    const run = (name: string) => {
      const compiled = compileExpression(op(name), { profile });
      return compiled.ok ? compiled.value.evaluate(() => ({ found: false })) : compiled;
    };
    expect(run("app:throw")).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_OPERATOR_ERROR" } });
    expect(run("app:async")).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_ASYNC_UNSUPPORTED" } });
    expect(run("app:bad")).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_INVALID_RESULT" } });
  });

  test("validates custom input and result metadata", () => {
    const profile = new ExpressionProfileBuilder("app")
      .add({ name: "app:number", arity: 1, inputTypes: ["number"], resultType: "number", execute: ([value]) => value! })
      .add({ name: "app:lies", arity: 0, resultType: "number", execute: () => "no" })
      .build();
    const wrongInput = compileExpression(op("app:number", literal("1")), { profile });
    const wrongResult = compileExpression(op("app:lies"), { profile });
    expect(wrongInput.ok && wrongInput.value.evaluate(() => ({ found: false }))).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_TYPE_MISMATCH" } });
    expect(wrongResult.ok && wrongResult.value.evaluate(() => ({ found: false }))).toMatchObject({ ok: false, diagnostic: { code: "EXPRESSION_TYPE_MISMATCH" } });
  });
});

describe("expression JSON Schema", () => {
  const compileSchema = (schema: object) => new Ajv2020({ strict: true }).compile(schema);

  test("describes strict profile-aware operator nodes and JSON-only values", () => {
    const schema = generateExpressionJsonSchema(standardV1) as any;
    expect(getStandardExpressionJsonSchema()).toEqual(schema);
    const variants = schema.$defs.expression.oneOf;
    const add = variants.find((candidate: any) => candidate.properties?.op?.const === "add");
    const and = variants.find((candidate: any) => candidate.properties?.op?.const === "and");
    expect(add.properties.args).toMatchObject({ minItems: 2, maxItems: 2 });
    expect(and.properties.args).toMatchObject({ minItems: 1, maxItems: 32 });
    expect(add.additionalProperties).toBe(false);
    expect(schema.$defs.jsonValue.anyOf.map((candidate: any) => candidate.type)).toEqual([
      "null", "boolean", "number", "string", "array", "object",
    ]);
    expect(Object.isFrozen(schema)).toBe(true);
  });

  test("returns deeply frozen schemas without shared mutable state", () => {
    const first = getStandardExpressionJsonSchema() as any;
    const variants = first.$defs.jsonValue.anyOf;
    expect(Object.isFrozen(first.$defs)).toBe(true);
    expect(Object.isFrozen(first.$defs.jsonValue)).toBe(true);
    expect(Object.isFrozen(variants)).toBe(true);
    expect(Object.isFrozen(variants[0])).toBe(true);
    expect(() => variants.push({ type: "undefined" })).toThrow(TypeError);
    expect((getStandardExpressionJsonSchema() as any).$defs.jsonValue.anyOf).toHaveLength(6);
  });

  test("AJV accepts representative standard expressions and rejects runtime-invalid shapes", () => {
    const validate = compileSchema(getStandardExpressionJsonSchema());
    for (const name of standardV1.definitions.map(({ name }) => name)) {
      const definition = standardV1.get(name)!;
      const count = definition.arity ?? definition.minArgs ?? 0;
      expect(validate(op(name, ...Array.from({ length: count }, () => literal(null))))).toBe(true);
    }
    expect(validate(op("unknown", literal(1)))).toBe(false);
    expect(validate(op("add", literal(1)))).toBe(false);
    expect(validate({ kind: "ref", ref: "x", extra: true })).toBe(false);
    expect(validate({ kind: "literal", value: Number.POSITIVE_INFINITY })).toBe(false);
    expect(validate(op("and", ...Array.from({ length: 33 }, () => literal(true))))).toBe(false);
  });

  test("includes only supplied custom profile operators and their arity", () => {
    const custom = new ExpressionProfileBuilder("custom")
      .add({ name: "app:pick", minArgs: 1, maxArgs: 2, execute: ([value]) => value! })
      .build();
    const schema = generateExpressionJsonSchema(custom) as any;
    const validate = compileSchema(schema);
    const operators = schema.$defs.expression.oneOf
      .map((candidate: any) => candidate.properties?.op?.const)
      .filter(Boolean);
    expect(operators).toEqual(["app:pick"]);
    expect(schema.$defs.expression.oneOf[2].properties.args).toMatchObject({ minItems: 1, maxItems: 2 });
    expect(validate(op("app:pick", literal(1)))).toBe(true);
    expect(validate(op("add", literal(1), literal(2)))).toBe(false);
  });

  test("supports profiles with no operator nodes", () => {
    const validate = compileSchema(generateExpressionJsonSchema(new ExpressionProfile("literal-only", [])));
    expect(validate(literal(1))).toBe(true);
    expect(validate(ref("x"))).toBe(true);
    expect(validate(op("anything"))).toBe(false);
  });
});
