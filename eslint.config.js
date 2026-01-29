// ESLint configuration for v9+ (flat config)
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import jestPlugin from "eslint-plugin-jest";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

/** @type {import("eslint").Linter.Config[]} */
export default [
  js.configs.recommended,
  
  // TypeScript files
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        project: "./tsconfig.json",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        Buffer: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      prettier: prettierPlugin, // ✅ Add Prettier plugin
    },
    rules: {
      ...prettierConfig.rules, // ✅ Disable ESLint rules that conflict with Prettier
      "prettier/prettier": "error", // ✅ Show Prettier errors as ESLint errors
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error", 
        { 
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_", // ✅ Also ignore vars starting with _
        }
      ],
      "no-console": "off",
    },
  },
  
  // Test files - Jest configuration
  {
    files: [
      "**/__tests__/**/*.ts",
      "**/*.test.ts",
      "**/*.spec.ts"
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        project: "./tsconfig.json",
      },
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        jest: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      jest: jestPlugin,
      prettier: prettierPlugin, // ✅ Add Prettier to tests too
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
      ...prettierConfig.rules, // ✅ Disable conflicts for tests
      "prettier/prettier": "error", // ✅ Prettier errors in tests
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { 
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        }
      ],
    },
  },
  
  // Ignore patterns
  {
    ignores: [
      "dist",
      "node_modules",
      "coverage",
      "*.config.js",
      "*.config.ts",
    ],
  },
];