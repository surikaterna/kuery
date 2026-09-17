import { describe, expect, test } from "vitest";
import * as kalada from "@kalada/core/kuery-v1";
import * as root from "../index.js";
import * as expression from "../expression/index.js";

const expressionRuntimeExports = [
  "canonicalizeExpression",
  "compileExpression",
  "extractExpressionDependencies",
  "DEFAULT_EXPRESSION_LIMITS",
  "generateExpressionJsonSchema",
  "getStandardExpressionJsonSchema",
  "ExpressionProfile",
  "ExpressionProfileBuilder",
  "MAX_EXPRESSION_OPERATOR_ARGS",
  "standardV1",
] as const;

describe("Kalada expression facade identity", () => {
  test.each(expressionRuntimeExports)("re-exports %s unchanged from the expression subpath", (name) => {
    expect(expression[name]).toBe(kalada[name]);
  });

  test.each(expressionRuntimeExports)("re-exports %s unchanged from the root", (name) => {
    expect(root[name]).toBe(kalada[name]);
  });
});
