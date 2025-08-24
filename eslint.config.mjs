import { baseConfig } from './eslint-shared.config.mjs'

export default [
  ...baseConfig,
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