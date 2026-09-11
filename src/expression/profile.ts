import type { JsonValue } from "./types.js";

export type ExpressionValueType = "any" | "null" | "boolean" | "number" | "string" | "array" | "object";
export const MAX_EXPRESSION_OPERATOR_ARGS = 32;
export type ExpressionOperatorFn = (args: readonly JsonValue[]) => JsonValue;
export type ExpressionEvaluationStrategy = "and" | "or" | "coalesce" | "exists";

export interface ExpressionOperatorDefinition {
  readonly name: string;
  readonly arity?: number;
  readonly minArgs?: number;
  readonly maxArgs?: number;
  readonly inputTypes?: readonly ExpressionValueType[];
  readonly resultType?: ExpressionValueType;
  readonly execute: ExpressionOperatorFn;
}

export interface ExpressionOperator extends ExpressionOperatorDefinition {
  readonly inputTypes?: readonly ExpressionValueType[];
  readonly strategy?: ExpressionEvaluationStrategy;
}

const OPERATOR_NAME = /^[a-z][a-z0-9-]*(?:[.:/][a-z][a-z0-9-]*)*$/;
const NAMESPACED_OPERATOR_NAME = /^[a-z][a-z0-9-]*[.:/][a-z][a-z0-9-]*(?:[.:/][a-z][a-z0-9-]*)*$/;
const PROFILE_NAME = /^[A-Za-z][A-Za-z0-9._:/@-]{0,127}$/;
const STANDARD_STRATEGIES = Symbol("standard expression strategies");
/**
 * Structurally immutable snapshot of operator metadata and callback identities.
 * Callbacks are trusted host code; their closed-over or function-object state remains producer-owned.
 */
export class ExpressionProfile {
  readonly name: string;
  readonly #operators: ReadonlyMap<string, ExpressionOperator>;

  constructor(
    name: string,
    operators: Iterable<ExpressionOperatorDefinition>,
    strategies?: typeof STANDARD_STRATEGIES,
  ) {
    validateProfileName(name);
    const snapshot = new Map<string, ExpressionOperator>();
    for (const definition of operators) {
      validateDefinition(definition);
      if (snapshot.has(definition.name)) throw new TypeError(`Duplicate expression operator: ${definition.name}`);
      snapshot.set(definition.name, freezeDefinition(
        definition,
        strategies === STANDARD_STRATEGIES ? standardStrategy(definition.name) : undefined,
      ));
    }
    this.name = name;
    this.#operators = snapshot;
    Object.freeze(this);
  }

  get(name: string): ExpressionOperator | undefined {
    return this.#operators.get(name);
  }

  has(name: string): boolean {
    return this.#operators.has(name);
  }

  get definitions(): readonly ExpressionOperator[] {
    return Object.freeze([...this.#operators.values()]);
  }
}

/** Mutable construction helper whose build result is an independent structural snapshot. */
export class ExpressionProfileBuilder {
  private readonly definitions = new Map<string, ExpressionOperatorDefinition>();

  constructor(private readonly name: string) {
    validateProfileName(name);
  }

  add(definition: ExpressionOperatorDefinition): this {
    validateDefinition(definition);
    if (!NAMESPACED_OPERATOR_NAME.test(definition.name)) {
      throw new TypeError("Custom expression operators require a namespaced name.");
    }
    if (this.definitions.has(definition.name)) throw new TypeError(`Duplicate expression operator: ${definition.name}`);
    this.definitions.set(definition.name, definition);
    return this;
  }

  build(): ExpressionProfile {
    return new ExpressionProfile(this.name, this.definitions.values());
  }
}

function validateDefinition(definition: ExpressionOperatorDefinition): void {
  if (!OPERATOR_NAME.test(definition.name) || typeof definition.execute !== "function") {
    throw new TypeError("Expression operator name or implementation is invalid.");
  }
  const hasExact = definition.arity !== undefined;
  if (hasExact === (definition.minArgs !== undefined || definition.maxArgs !== undefined)) {
    throw new TypeError("Expression operators require exact arity or min/max arity.");
  }
  if (hasExact) validateCount(definition.arity);
  if (definition.minArgs !== undefined) validateCount(definition.minArgs);
  if (definition.maxArgs !== undefined) validateCount(definition.maxArgs);
  if ((definition.minArgs ?? 0) > (definition.maxArgs ?? Number.MAX_SAFE_INTEGER)) {
    throw new TypeError("Expression operator minimum arity exceeds maximum arity.");
  }
  if (definition.inputTypes && hasExact && definition.inputTypes.length !== definition.arity) {
    throw new TypeError("Expression operator input metadata must match exact arity.");
  }
  if (definition.inputTypes && !hasExact && definition.inputTypes.length !== 1) {
    throw new TypeError("Variadic expression operators accept one repeated input type.");
  }
}

function validateProfileName(name: string): void {
  if (!PROFILE_NAME.test(name)) throw new TypeError("Expression profile name is invalid.");
}

function validateCount(value: number | undefined): void {
  if (!Number.isSafeInteger(value) || (value ?? -1) < 0 || (value ?? 0) > MAX_EXPRESSION_OPERATOR_ARGS) {
    throw new TypeError("Expression operator arity is invalid.");
  }
}

function freezeDefinition(
  definition: ExpressionOperatorDefinition,
  strategy?: ExpressionEvaluationStrategy,
): ExpressionOperator {
  return Object.freeze({
    name: definition.name,
    arity: definition.arity,
    minArgs: definition.minArgs,
    maxArgs: definition.maxArgs,
    inputTypes: definition.inputTypes ? Object.freeze([...definition.inputTypes]) : undefined,
    resultType: definition.resultType,
    strategy,
    execute: definition.execute,
  });
}

function standardStrategy(name: string): ExpressionEvaluationStrategy | undefined {
  if (name === "and" || name === "or" || name === "coalesce" || name === "exists") return name;
  return undefined;
}

function createStandardProfile(
  name: string,
  operators: Iterable<ExpressionOperatorDefinition>,
): ExpressionProfile {
  return new ExpressionProfile(name, operators, STANDARD_STRATEGIES);
}

export const internalProfile = Object.freeze({ createStandardProfile });
