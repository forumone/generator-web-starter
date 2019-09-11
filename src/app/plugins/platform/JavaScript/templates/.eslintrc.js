module.exports = {
    "env": {
        "browser": true
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": "tsconfig.json",
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint",
        "@typescript-eslint/tslint"
    ],
    "rules": {
        "@typescript-eslint/indent": "off",
        "@typescript-eslint/member-delimiter-style": "off",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-inferrable-types": "error",
        "@typescript-eslint/no-param-reassign": "error",
        "@typescript-eslint/no-require-imports": "error",
        "@typescript-eslint/no-this-alias": "error",
        "@typescript-eslint/no-var-requires": "error",
        "@typescript-eslint/type-annotation-spacing": "off",
        "arrow-parens": [
            "off",
            "as-needed"
        ],
        "constructor-super": "error",
        "curly": "error",
        "dot-notation": "error",
        "eol-last": "off",
        "guard-for-in": "error",
        "linebreak-style": "off",
        "new-parens": "off",
        "newline-per-chained-call": "off",
        "no-empty": "error",
        "no-empty-functions": "error",
        "no-extra-semi": "off",
        "no-fallthrough": "error",
        "no-irregular-whitespace": "off",
        "no-multiple-empty-lines": "off",
        "no-sparse-arrays": "error",
        "no-template-curly-in-string": "error",
        "no-unsafe-finally": "error",
        "no-var": "error",
        "object-shorthand": "error",
        "one-var": "error",
        "prefer-const": "error",
        "prefer-template": "error",
        "quote-props": [
            "error",
            "as-needed"
        ],
        "some-rule": "error",
        "space-before-function-paren": "off",
    }
};
