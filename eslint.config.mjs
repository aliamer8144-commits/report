import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // TypeScript - قواعد مهمة مفعّلة
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-explicit-any": "off", // مؤقت - سيُعالج في #18
      "@typescript-eslint/no-non-null-assertion": "warn",

      // React Hooks - مهم جداً
      "react-hooks/exhaustive-deps": "warn",

      // General - قواعد أساسية
      "no-console": "off",
      "no-debugger": "warn",
      "no-empty": "warn",
      "prefer-const": "warn",
      "no-redeclare": "warn",
      "no-fallthrough": ["warn", { commentPattern: "falls?through" }],
      "no-unreachable": "warn",
    },
  },
);
