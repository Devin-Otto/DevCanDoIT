import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import nextTypescript from "eslint-config-next/typescript.js";
import nextVitals from "eslint-config-next/core-web-vitals.js";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended
});

const config = [
  {
    ignores: [".next/**", ".next-stale*/**", "node_modules/**", "next-env.d.ts"]
  },
  ...compat.config(nextVitals),
  ...compat.config(nextTypescript)
];

export default config;
