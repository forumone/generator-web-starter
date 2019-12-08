module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": "tsconfig.json",
        "sourceType": "module"
    },
    "plugins": [
        "react",
        "@typescript-eslint",
        "implicit-dependencies"
    ],
    "extends": [
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:prettier/recommended",
        "prettier/@typescript-eslint",
    ],
    "react": {
      "pragma": "React",
      "version": "detect"
    },
    "rules": {
        "@typescript-eslint/camelcase": ["error", {
            "properties": "never",
            "ignoreDestructuring": true,
        }],
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/no-require-imports": "error",
        "arrow-parens": [
            "off",
            "as-needed"
        ],
        "curly": "error",
        "dot-notation": "error",
        "eqeqeq": "error",
        "guard-for-in": "error",
        "implicit-dependencies/no-implicit": ["error", { optional: true }],
        "no-console": "error",
        "no-empty-function": "error",
        "no-floating-decimal": "error",
        "no-irregular-whitespace": "off",
        "no-param-reassign": "error",
        "no-template-curly-in-string": "error",
        "no-unused-expressions": "error",
        "no-var": "error",
        "object-shorthand": "error",
        "one-var": ["error", "never"],
        "prefer-const": "error",
        "prefer-template": "error",
        "quote-props": [
            "error",
            "as-needed"
        ],

        // TS already checks this and it causes problems
        // https://github.com/yannickcr/eslint-plugin-react/issues/2353#issuecomment-513036364
        "react/prop-types": 0,

        "sort-imports": ["error", {
            "ignoreCase": true,
            "ignoreDeclarationSort": true,
        }],
    }
};
