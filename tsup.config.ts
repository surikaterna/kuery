import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    collection: "src/collection/index.ts",
    filter: "src/filter-compiler.ts",
    compile: "src/compile.ts",
    evaluate: "src/evaluator.ts",
    trace: "src/failure-trace.ts",
    operators: "src/operators.ts",
    ast: "src/ast.ts",
    errors: "src/errors.ts",
    "safe-path": "src/safe-path.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  clean: true,
  sourcemap: true,
  cjsInterop: true,
  footer({ format }) {
    if (format === "cjs") {
      return {
        js: `if (module.exports.default) { const _default = module.exports.default; Object.keys(module.exports).forEach(function(k) { if (k !== "default" && k !== "__esModule") _default[k] = module.exports[k]; }); module.exports = _default; }`,
      };
    }
    return {};
  },
});
