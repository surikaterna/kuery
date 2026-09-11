import {
  compileExpression,
  generateExpressionJsonSchema,
  getStandardExpressionJsonSchema,
  type JsonValue,
  type ReferenceCodec,
  type ReferenceResolver,
  standardV1,
  type ValueExpression,
} from "kuery/expression";

type AppReference = { readonly namespace: string; readonly segments: readonly (string | number)[] };

const expression: ValueExpression<AppReference> = {
  kind: "ref",
  ref: { namespace: "data", segments: ["customer", 0, "name"] },
};

const codec: ReferenceCodec<AppReference> = {
  validate: (input): input is AppReference => typeof input === "object" && input !== null,
};

const compiled = compileExpression<AppReference>(expression, { profile: standardV1, reference: codec });
const schema: Readonly<Record<string, unknown>> = generateExpressionJsonSchema(standardV1);
const standardSchema: Readonly<Record<string, unknown>> = getStandardExpressionJsonSchema();
void schema;
void standardSchema;
const resolver: ReferenceResolver<AppReference> = (reference) => ({ found: true, value: reference.namespace });
if (compiled.ok) {
  const evaluated = compiled.value.evaluate(resolver);
  const value: JsonValue | undefined = evaluated.ok ? evaluated.value : undefined;
  void value;
}
