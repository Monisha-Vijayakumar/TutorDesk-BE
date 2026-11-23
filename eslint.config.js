import eslint from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules", ".local-db"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // `_name` = intentionally unused (e.g. Express's 4-argument error handler); rest siblings drop fields.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "@typescript-eslint/explicit-function-return-type": ["error", { allowExpressions: true }],
      "func-style": ["error", "expression"],
      "prefer-arrow-callback": "error",
    },
  }
)
