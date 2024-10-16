/* eslint-env node */
module.exports = {
    root: true,
    extends: [
        'plugin:ghost/ts',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended'
    ],
    plugins: [
        'ghost',
        'react-refresh',
        'tailwindcss'
    ],
    settings: {
        react: {
            version: 'detect'
        }
    },
    rules: {
        // ----------------------
        // Rules COPIED from base config, remove these when the config is fixed

        // Style Rules
        // Require 4 spaces
        indent: ['error', 4],
        // Require single quotes for strings & properties (allows template literals)
        quotes: ['error', 'single', {allowTemplateLiterals: true}],
        'quote-props': ['error', 'as-needed'],
        // Require semi colons, always at the end of a line
        semi: ['error', 'always'],
        'semi-style': ['error', 'last'],
        // Don't allow dangling commas
        'comma-dangle': ['error', 'never'],
        // Always require curly braces, and position them at the end and beginning of lines
        curly: 'error',
        'brace-style': ['error', '1tbs'],
        // Don't allow padding inside of blocks
        'padded-blocks': ['error', 'never'],
        // Require objects to be consistently formatted with newlines
        'object-curly-newline': ['error', {consistent: true}],
        // Don't allow more than 1 consecutive empty line or an empty 1st line
        'no-multiple-empty-lines': ['error', {max: 1, maxBOF: 0}],
        // Variables must be camelcase, but properties are not checked
        camelcase: ['error', {properties: 'never'}],
        // Allow newlines before dots, not after e.g. .then goes on a new line
        'dot-location': ['error', 'property'],
        // Prefer dot notation over array notation
        'dot-notation': ['error'],

        // Spacing rules
        // Don't allow multiple spaces anywhere
        'no-multi-spaces': 'error',
        // Anonymous functions have a sape, named functions never do
        'space-before-function-paren': ['error', {anonymous: 'always', named: 'never'}],
        // Don't put spaces inside of objects or arrays
        'object-curly-spacing': ['error', 'never'],
        'array-bracket-spacing': ['error', 'never'],
        // Allow a max of one space between colons and values
        'key-spacing': ['error', {mode: 'strict'}],
        // Require spaces before and after keywords like if, else, try, catch etc
        'keyword-spacing': 'error',
        // No spaces around semis
        'semi-spacing': 'error',
        // 1 space around arrows
        'arrow-spacing': 'error',
        // Don't allow spaces inside parenthesis
        'space-in-parens': ['error', 'never'],
        // Require single spaces either side of operators
        'space-unary-ops': 'error',
        'space-infix-ops': 'error',

        // Best practice rules
        // Require === / !==
        eqeqeq: ['error', 'always'],
        // Don't allow ++ and --
        'no-plusplus': ['error', {allowForLoopAfterthoughts: true}],
        // Don't allow eval
        'no-eval': 'error',
        // Throw errors for unnecessary usage of .call or .apply
        'no-useless-call': 'error',
        // Don't allow console.* calls
        'no-console': 'error',
        // Prevent [variable shadowing](https://en.wikipedia.org/wiki/Variable_shadowing)
        'no-shadow': ['error'],

        // Return rules
        // Prevent missing return statements in array functions like map & reduce
        'array-callback-return': 'error',
        'no-constructor-return': 'error',
        'no-promise-executor-return': 'error',

        // Arrow function styles
        // Do not enforce single lines when using arrow functions.
        // https://eslint.org/docs/rules/arrow-body-style
        'arrow-body-style': 'off',
        'arrow-parens': ['error', 'as-needed', {requireForBlockBody: true}],
        'implicit-arrow-linebreak': 'error',
        'no-confusing-arrow': 'error',

        // ----------------------
        // Rules NOT COPIED from base config, keep these

        // sort multiple import lines into alphabetical groups
        'ghost/sort-imports-es6-autofix/sort-imports-es6': ['error', {
            memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
        }],

        // TODO: enable this when we have the time to retroactively go and fix the issues
        'prefer-const': 'off',

        // TODO: re-enable this (maybe fixed fast refresh?)
        'react-refresh/only-export-components': 'off',

        // suppress errors for missing 'import React' in JSX files, as we don't need it
        'react/react-in-jsx-scope': 'off',
        // ignore prop-types for now
        'react/prop-types': 'off',

        // TODO: re-enable this because otherwise we're just skirting TS
        '@typescript-eslint/no-explicit-any': 'warn',

        // TODO: re-enable these if deemed useful
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-empty-function': 'off',

        // custom react rules
        'react/jsx-sort-props': ['error', {
            reservedFirst: true,
            callbacksLast: true,
            shorthandLast: true,
            locale: 'en'
        }],
        'react/button-has-type': 'error',
        'react/no-array-index-key': 'error',
        'react/jsx-key': 'off',

        'tailwindcss/classnames-order': ['error', {config: 'tailwind.config.cjs'}],
        'tailwindcss/enforces-negative-arbitrary-values': ['warn', {config: 'tailwind.config.cjs'}],
        'tailwindcss/enforces-shorthand': ['warn', {config: 'tailwind.config.cjs'}],
        'tailwindcss/migration-from-tailwind-2': ['warn', {config: 'tailwind.config.cjs'}],
        'tailwindcss/no-arbitrary-value': 'off',
        'tailwindcss/no-custom-classname': 'off',
        'tailwindcss/no-contradicting-classname': ['error', {config: 'tailwind.config.cjs'}]
    }
};
