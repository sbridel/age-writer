// Vérifications utiles seulement (variables non définies / inutilisées, code mort) : pas de style.
import globals from "globals";

export default [
  { ignores: ["dist/**", "release/**", "legacy/**", "src/engine/vendor/**", "node_modules/**", "test/fixture-main.js", "test/visual/out/**"] },
  {
    files: ["**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "commonjs", globals: { ...globals.node, ...globals.browser } },
    rules: {
      "no-undef": "error", "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }], "no-unreachable": "error",
      "no-dupe-keys": "error", "no-dupe-class-members": "error", "no-redeclare": "error", "no-self-assign": "error", "no-const-assign": "error",
      "no-cond-assign": ["error", "except-parens"], "no-fallthrough": "error", "use-isnan": "error", "valid-typeof": "error", "no-sparse-arrays": "error",
    },
  },
];
