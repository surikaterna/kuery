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
  assert.equal(api.standardV1.name, "standard-v1");
  const compiled = api.compileExpression(
    { kind: "op", op: "add", args: [{ kind: "literal", value: 1 }, { kind: "literal", value: 2 }] },
    { profile: api.standardV1 },
  );
  assert.deepEqual(compiled.ok && compiled.value.evaluate(() => ({ found: false })), { ok: true, value: 3 });
}

console.log("expression ESM/CJS smoke passed");
