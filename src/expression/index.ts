export { canonicalizeExpression } from "./canonicalize.js";
export { compileExpression, type CompileExpressionOptions } from "./compile.js";
export { extractExpressionDependencies } from "./dependencies.js";
export { DEFAULT_EXPRESSION_LIMITS } from "./limits.js";
export { generateExpressionJsonSchema, getStandardExpressionJsonSchema, type ExpressionJsonSchema } from "./json-schema.js";
export {
  ExpressionProfile,
  ExpressionProfileBuilder,
  MAX_EXPRESSION_OPERATOR_ARGS,
  type ExpressionOperator,
  type ExpressionOperatorDefinition,
  type ExpressionOperatorFn,
  type ExpressionValueType,
} from "./profile.js";
export { standardV1 } from "./standard-profile.js";
export type {
  CanonicalizeExpressionOptions,
  CompiledExpression,
  ExpressionDiagnostic,
  ExpressionDiagnosticCode,
  ExpressionLimits,
  ExpressionPath,
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  ReferenceCodec,
  ReferenceResolution,
  ReferenceResolver,
  Result,
  ValueExpression,
} from "./types.js";
