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
        "prettier",
        "implicit-dependencies"
    ],
    "extends": [
        "plugin:prettier/recommended"
    ],
    "rules": {
        "@typescript-eslint/class-name-casing": "error",
        "@typescript-eslint/indent": "off",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-inferrable-types": "error",
        "@typescript-eslint/no-require-imports": "error",
        "@typescript-eslint/no-this-alias": "error",
        "@typescript-eslint/no-var-requires": "error",
        "@typescript-eslint/type-annotation-spacing": "off",
        "arrow-parens": [
            "off",
            "as-needed"
        ],
        "camelcase": ["error", {
            "properties": "never",
            "allow": ["read_only", "env_file", "depends_on", "working_dir"]
        }],
        "constructor-super": "error",
        "curly": "error",
        "dot-notation": "error",
        "eol-last": "off",
        "eqeqeq": "error",
        "guard-for-in": "error",
        "linebreak-style": "off",
        "new-parens": "off",
        "newline-per-chained-call": "off",
        "no-console": "error",
        "no-empty": "error",
        "no-empty-function": "error",
        "no-extra-semi": "off",
        "no-fallthrough": "error",
        "no-floating-decimal": "error",
        "no-irregular-whitespace": "off",
        "no-multiple-empty-lines": "off",
        "no-param-reassign": "error",
        "no-sparse-arrays": "error",
        "no-template-curly-in-string": "error",
        "no-unsafe-finally": "error",
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
        "space-before-function-paren": "off",
        "prettier/prettier": "error",
        "implicit-dependencies/no-implicit": ["error", { optional: true }]
    }
};