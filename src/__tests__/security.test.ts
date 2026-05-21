import { describe, expect, it } from "vitest";
import type { ExprNode } from "../ast.js";
import { compile } from "../compile.js";
import { KueryError } from "../errors.js";
import { evaluate } from "../evaluator.js";
import { compileFilterFromAst } from "../filter-compiler.js";
import { assertSafeSegment } from "../safe-path.js";

function makeScope(
  data: Record<string, unknown> = {},
  uiState: unknown = {},
  meta: unknown = {},
): Record<string, unknown> {
  return { ...data, $ui: uiState, $meta: meta };
}

function path(p: string): ExprNode {
  return { kind: "path", path: p };
}

function op(name: string, ...args: ExprNode[]): ExprNode {
  return { kind: "op", op: name, args };
}

function lit(value: string | number | boolean | null): ExprNode {
  return { kind: "literal", value };
}

describe("prototype pollution prevention", () => {
  describe("assertSafeSegment", () => {
    it("rejects __proto__", () => {
      expect(() => assertSafeSegment("__proto__")).toThrow(KueryError);
    });

    it("rejects constructor", () => {
      expect(() => assertSafeSegment("constructor")).toThrow(KueryError);
    });

    it("rejects prototype", () => {
      expect(() => assertSafeSegment("prototype")).toThrow(KueryError);
    });

    it("allows normal segments", () => {
      expect(() => assertSafeSegment("name")).not.toThrow();
      expect(() => assertSafeSegment("foo")).not.toThrow();
    });
  });

  describe("evaluate path resolution", () => {
    it("rejects __proto__ in path", () => {
      const scope = makeScope({ safe: "ok" });
      expect(() => evaluate(path("__proto__.polluted"), scope)).toThrow("prototype pollution");
    });

    it("rejects constructor.prototype path", () => {
      const scope = makeScope({});
      expect(() => evaluate(path("constructor.prototype"), scope)).toThrow("prototype pollution");
    });

    it("resolves normal paths after hardening", () => {
      const scope = makeScope({ user: { name: "Alice" } });
      expect(evaluate(path("user.name"), scope)).toBe("Alice");
    });
  });

  describe("compile path validation via shorthand", () => {
    it("compiles normal paths via shorthand", () => {
      const ast = compile({ "user.name": "Alice" });
      expect(ast.kind).toBe("op");
    });
  });
});

describe("recursion depth guard", () => {
  function buildDeepAst(depth: number): ExprNode {
    let node: ExprNode = lit(true);
    for (let i = 0; i < depth; i++) {
      node = op("$not", node);
    }
    return node;
  }

  it("evaluates within default depth limit", () => {
    const node = buildDeepAst(100);
    const scope = makeScope();
    expect(() => evaluate(node, scope)).not.toThrow();
  });

  it("throws when exceeding depth limit", () => {
    const node = buildDeepAst(300);
    const scope = makeScope();
    expect(() => evaluate(node, scope)).toThrow("exceeded maximum depth");
  });

  it("respects custom maxDepth", () => {
    const node = buildDeepAst(10);
    const scope = makeScope();
    expect(() => evaluate(node, scope, { maxDepth: 5 })).toThrow("exceeded maximum depth");
  });
});

describe("compileFilterFromAst maxDepth", () => {
  it("enforces maxDepth", () => {
    let ast: ExprNode = { kind: "literal", value: true };
    for (let i = 0; i < 20; i++) {
      ast = { kind: "op", op: "$not", args: [ast] };
    }
    expect(() => compileFilterFromAst(ast, { maxDepth: 10 })).toThrow("exceeded maximum depth");
  });
});
