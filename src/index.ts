// Primary API

// Types
export type { EvaluationScope, ExpressionDefinition, ExprNode } from "./ast.js";
// Collections
export { type FindOptions, find } from "./collection/find.js";
export { findOne } from "./collection/find-one.js";
// Compilation
// Backward compatibility
export { compile, compileShorthand, type Query, type ShorthandQuery } from "./compile.js";
export { KueryError, type KueryErrorCode } from "./errors.js";
// Evaluation (thin facade)
export { type EvaluateOptions, evaluate } from "./evaluator.js";
// Diagnostics
export { type EvaluateWithTraceResult, evaluateWithTrace, type KueryFailureTrace } from "./failure-trace.js";
export {
  type CompileFilterOptions,
  compileFilter,
  compileFilterFromAst,
  compileRawFromAst,
  type FilterFn,
} from "./filter-compiler.js";
export { clearRegexCache, getRegexCacheSize } from "./regex-cache.js";
// Extensibility
export {
  type CustomOperatorEntry,
  type CustomOperatorFn,
  type OperatorDefinition,
  OperatorRegistry,
} from "./operators.js";

// Path utilities
export {
  collectPath,
  resolvePath,
  validateAndSplitPath,
} from "./path-utils.js";
export { Kuery, type KueryOptions } from "./kuery.js";
// Default export for CJS compat
import { Kuery as _Kuery } from "./kuery.js";
export default _Kuery;
// Safety
export { assertSafeSegment, DANGEROUS_KEYS } from "./safe-path.js";

// Sort utilities
export { applySorting, compareValues } from "./sort-utils.js";
export type { CustomFieldOps, DotPaths, FieldCondition, PathValue, TypedQuery, UntypedQuery } from "./typed-query.js";
