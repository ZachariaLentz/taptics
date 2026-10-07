const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expoConfig,
  { ignores: ["dist/**", "coverage/**", "ios/**", "android/**"] },
  // Jest mock factories need deferred CommonJS imports.
  {
    files: ["tests/**"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  { rules: { "no-eval": "error" } },
]);
