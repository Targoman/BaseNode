import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";


export default [
  { files: ["**/*.{js,mjs,cjs,ts,vue}"] },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/essential"],
  {
    files: ["**/*.ts"],
    rules: {
      '@typescript-eslint/no-unsafe-function-type': 0,
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
    }
  },
  {
    files: ["**/*.vue"],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
    rules: {
      "vue/multi-word-component-names": ["error", {
        "ignores": ["index"]
      }]
    }
  },
  {
    ignores: [
      "*.sh",
      "node_modules",
      "lib",
      "*.md",
      "*.scss",
      "*.woff",
      "*.ttf",
      ".vscode",
      ".idea",
      "dist",
      ".dist",
      "mock",
      "public",
      "bin",
      "build",
      ".build",
      "config",
      "index.html",
      "src/assets",
    ]
  }
];