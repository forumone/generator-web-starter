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
        "@typescript-eslint",
    ],
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:prettier/recommended",
        "prettier",
    ],
    "rules": {
        "@typescript-eslint/camelcase": ["error", {
            "properties": "never",
            "ignoreDestructuring": true,
        }],
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/no-require-imports": "error",
        "arrow-parens": [
            "off",
            "as-needed"
        ],
        "curly": "error",
        "dot-notation": "error",
        "eqeqeq": "error",
        "guard-for-in": "error",
        "no-console": "error",
        "no-constant-condition": "off",
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
        "sort-imports": ["error", {
            "ignoreCase": true,
            "ignoreDeclarationSort": true,
        }],
    }
};
