import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import terser from "@rollup/plugin-terser";
import replace from "@rollup/plugin-replace";
import dts from "rollup-plugin-dts";
import type { OutputOptions, RollupOptions } from "rollup";

const isProduction = process.env.NODE_ENV !== "development";
const NODE_ENV = isProduction ? "production" : "development";
process.env.NODE_ENV = NODE_ENV;

const esmOutput: OutputOptions = {
  dir: "lib",
  entryFileNames: "index.mjs",
  format: "esm",
};
const cjsOutput: OutputOptions = {
  dir: "lib",
  entryFileNames: "index.cjs",
  format: "cjs",
};
const output = isProduction ? [esmOutput, cjsOutput] : esmOutput;

const config: RollupOptions[] = [
  {
    input: "src/index.ts",
    output,
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript(),
      json(),
      replace({
        preventAssignment: true,
        values: { "process.env.NODE_ENV": `"${NODE_ENV}"` },
      }),
      isProduction && terser(),
    ],
  },
];

if (isProduction) {
  config.push({
    input: "src/index.ts",
    output: [{ file: "lib/index.d.ts", format: "es" }],
    plugins: [dts()],
  });
}

export default config;
