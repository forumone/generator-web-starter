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
        "@typescript-eslint/tslint"
    ],
    "rules": {
        "@typescript-eslint/indent": "off",
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
        "no-console": "error",
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
        "@typescript-eslint/tslint/config": [
            "error",
            {
                "rulesDirectory": [
                    "./node_modules/tslint-plugin-prettier/rules"
                ],
                "rules": {
                    "no-implicit-dependencies": [
                        true,
                        "optional"
                    ],
                    "no-unused-expression": true,
                    "number-literal-format": true,
                    "ordered-imports": [
                        true,
                        {
                            "grouped-imports": true
                        }
                    ],
                    "prettier": true,
                    "quotemark": [
                        true,
                        "single",
                        "jsx-double",
                        "avoid-escape",
                        "avoid-template"
                    ],
                    "triple-equals": true,
                    "variable-name": [
                        true,
                        "check-format",
                        "allow-pascal-case",
                        "ban-keywords",
                        "allow-leading-underscore"
                    ]
                }
            }
        ]
    }
};
