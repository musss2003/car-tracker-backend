// ESLint configuration for v9+ (flat config)
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import jestPlugin from "eslint-plugin-jest"; // ✅ Import Jest plugin

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
        // ✅ Add Node.js globals
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
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error", 
        { argsIgnorePattern: "^_" }
      ],
      "no-console": "off",
    },
  },
  
  // ✅ Test files - Jest configuration
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
        // ✅ Jest globals
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
      jest: jestPlugin, // ✅ Add Jest plugin
    },
    rules: {
      ...jestPlugin.configs.recommended.rules, // ✅ Jest recommended rules
      "@typescript-eslint/no-explicit-any": "off", // Allow 'any' in tests
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" }
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