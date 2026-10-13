import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
const config = [
  { ignores: ["pb_hooks/**", "pb_migrations/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript")
];

export default config;
