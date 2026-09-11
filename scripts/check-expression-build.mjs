import assert from "node:assert/strict";
import { createRequire } from "node:module";

const esm = await import("kuery/expression");
const rootEsm = await import("kuery");
const require = createRequire(import.meta.url);
const cjs = require("kuery/expression");
const rootCjs = require("kuery");

assert.equal(typeof rootEsm.compileExpression, "function");
assert.equal(typeof rootCjs.compileExpression, "function");

for (const api of [esm, cjs]) {
  assert.equal(typeof api.compileExpression, "function");
  assert.equal(typeof api.generateExpressionJsonSchema, "function");
  assert.equal(typeof api.getStandardExpressionJsonSchema, "function");
  assert.equal(typeof api.standardV1.extend, "function");
  assert.equal(api.standardV1.name, "standard-v1");
  const compiled = api.compileExpression(
    { kind: "op", op: "add", args: [{ kind: "literal", value: 1 }, { kind: "literal", value: 2 }] },
    { profile: api.standardV1 },
  );
  assert.deepEqual(compiled.ok && compiled.value.evaluate(() => ({ found: false })), { ok: true, value: 3 });
  const extended = api.standardV1.extend("smoke-v1", [
    { name: "smoke:constant", arity: 0, execute: () => 7 },
  ]);
  const fallback = api.compileExpression(
    { kind: "op", op: "if", args: [{ kind: "literal", value: true }, { kind: "op", op: "smoke:constant", args: [] }, { kind: "ref", ref: "missing" }] },
    { profile: extended },
  );
  assert.deepEqual(fallback.ok && fallback.value.evaluate(() => ({ found: false })), { ok: true, value: 7 });
}

console.log("expression ESM/CJS smoke passed");
