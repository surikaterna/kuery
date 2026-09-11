import { ExpressionFailure } from "./result.js";
import type { ExpressionPath, JsonObject, JsonValue } from "./types.js";

export const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export interface ValidationState {
  readonly maxDepth: number;
  readonly maxNodes: number;
  readonly maxStringLength: number;
  nodes: number;
  readonly active: WeakSet<object>;
}

export function dataProperties(
  input: unknown,
  path: ExpressionPath,
  allowed?: ReadonlySet<string>,
  maxProperties?: number,
): Readonly<Record<string, unknown>> {
  if (!isPlainObject(input)) throw new ExpressionFailure("EXPRESSION_INVALID_INPUT", path);
  try {
    const keys = Reflect.ownKeys(input);
    if (maxProperties !== undefined && keys.length > maxProperties) {
      throw new ExpressionFailure("EXPRESSION_LIMIT_EXCEEDED", path);
    }
    const output: Record<string, unknown> = {};
    for (const key of keys) {
      if (typeof key !== "string" || UNSAFE_KEYS.has(key) || (allowed && !allowed.has(key))) {
        throw new ExpressionFailure("EXPRESSION_INVALID_INPUT", [...path, String(key)]);
      }
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        throw new ExpressionFailure("EXPRESSION_INVALID_INPUT", [...path, key]);
      }
      Object.defineProperty(output, key, { value: descriptor.value, enumerable: true, writable: true });
    }
    return output;
  } catch (error) {
    if (error instanceof ExpressionFailure) throw error;
    throw new ExpressionFailure("EXPRESSION_INVALID_INPUT", path);
  }
}

function isPlainObject(input: unknown): input is object {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  try {
    const prototype = Object.getPrototypeOf(input);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

export function cloneJson(input: unknown, path: ExpressionPath, depth: number, state: ValidationState): JsonValue {
  countValue(input, path, depth, state);
  if (input === null || typeof input === "boolean") return input;
  if (typeof input === "number") return input;
  if (typeof input === "string") return cloneString(input, path, state.maxStringLength);
  if (Array.isArray(input)) return cloneArray(input, path, depth, state);
  return cloneObject(input as object, path, depth, state);
}

function countValue(input: unknown, path: ExpressionPath, depth: number, state: ValidationState): void {
  state.nodes += 1;
  if (depth > state.maxDepth || state.nodes > state.maxNodes) {
    throw new ExpressionFailure("EXPRESSION_LIMIT_EXCEEDED", path);
  }
  if (typeof input === "number" && !Number.isFinite(input)) {
    throw new ExpressionFailure("EXPRESSION_INVALID_INPUT", path);
  }
  if (input === null || ["boolean", "number", "string"].includes(typeof input)) return;
  if (typeof input !== "object") throw new ExpressionFailure("EXPRESSION_INVALID_INPUT", path);
}

function cloneString(input: string, path: ExpressionPath, maxLength: number): string {
  if (input.length > maxLength) throw new ExpressionFailure("EXPRESSION_LIMIT_EXCEEDED", path);
  return input;
}

function cloneArray(input: unknown[], path: ExpressionPath, depth: number, state: ValidationState): JsonValue {
  enter(input, path, state);
  try {
    if (input.length > state.maxNodes - state.nodes) {
      throw new ExpressionFailure("EXPRESSION_LIMIT_EXCEEDED", path);
    }
    const keys = Reflect.ownKeys(input);
    if (keys.some((key) => typeof key === "symbol" || (key !== "length" && !isArrayIndex(key, input.length)))) {
      throw new ExpressionFailure("EXPRESSION_INVALID_INPUT", path);
    }
    const values: JsonValue[] = [];
    for (let index = 0; index < input.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        throw new ExpressionFailure("EXPRESSION_INVALID_INPUT", [...path, index]);
      }
      values.push(cloneJson(descriptor.value, [...path, index], depth + 1, state));
    }
    return Object.freeze(values);
  } catch (error) {
    if (error instanceof ExpressionFailure) throw error;
    throw new ExpressionFailure("EXPRESSION_INVALID_INPUT", path);
  } finally {
    state.active.delete(input);
  }
}

function cloneObject(input: object, path: ExpressionPath, depth: number, state: ValidationState): JsonObject {
  enter(input, path, state);
  try {
    const properties = dataProperties(input, path, undefined, state.maxNodes - state.nodes);
    const output: Record<string, JsonValue> = {};
    for (const key of Object.keys(properties).sort()) {
      Object.defineProperty(output, key, {
        value: cloneJson(properties[key], [...path, key], depth + 1, state),
        enumerable: true,
      });
    }
    return Object.freeze(output);
  } finally {
    state.active.delete(input);
  }
}

function enter(input: object, path: ExpressionPath, state: ValidationState): void {
  if (state.active.has(input)) throw new ExpressionFailure("EXPRESSION_INVALID_INPUT", path);
  state.active.add(input);
}

function isArrayIndex(key: string, length: number): boolean {
  if (!/^(0|[1-9]\d*)$/.test(key)) return false;
  const index = Number(key);
  return Number.isSafeInteger(index) && index < length;
}

export function stableJson(value: JsonValue): string {
  return JSON.stringify(value);
}
