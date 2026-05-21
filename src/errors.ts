/** Discriminated error codes for all predicate-related failures. */
export type KueryErrorCode =
  | "KUERY_PARSE_INVALID_ROOT"
  | "KUERY_PARSE_UNKNOWN_OPERATOR"
  | "FORMBAR_EXPR_PARSE_INVALID_ARGUMENTS"
  | "FORMBAR_EXPR_PARSE_INVALID_PATH"
  | "FORMBAR_EXPR_COMPILE_UNSUPPORTED_LITERAL"
  | "FORMBAR_EXPR_COMPILE_AMBIGUOUS_OBJECT"
  | "KUERY_TYPE_MISMATCH"
  | "PREDICATE_PROTOTYPE_POLLUTION"
  | "KUERY_DEPTH_EXCEEDED"
  | "KUERY_UNKNOWN_OPERATOR"
  | "KUERY_FIND_ONE";

/** Typed error with a discriminated code for programmatic error handling. */
export class KueryError extends Error {
  readonly code: KueryErrorCode;
  readonly sourcePath?: string | undefined;

  constructor(code: KueryErrorCode, message: string, sourcePath?: string) {
    super(message);
    this.name = "KueryError";
    this.code = code;
    this.sourcePath = sourcePath;
  }
}
