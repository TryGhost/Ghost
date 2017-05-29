/* eslint-env node */
module.exports = {
    root: true,
    parserOptions: {
        ecmaVersion: 2017,
        sourceType: 'module'
    },
    env: {
        browser: true
    },
    extends: [
        'eslint:recommended',
        'plugin:ember-suave/recommended'
    ],
    plugins: [
        'sort-imports-es6-autofix'
    ],
    rules: {
        indent: ['error', 4],
        'space-before-function-paren': ['error', {anonymous: 'ignore', named: 'never'}],
        'object-curly-spacing': ['error', 'never'],
        'array-bracket-spacing': ['error', 'never'],
        'key-spacing': ['error', {mode: 'minimum'}],
        'keyword-spacing': ['error', {overrides: {
            'catch': {'after': true}
        }}],
        'ember-suave/require-access-in-comments': 'off',
        'sort-imports-es6-autofix/sort-imports-es6': ['error', {
            memberSyntaxSortOrder: ['none', 'all', 'single', 'multiple']
        }]
    },
    globals: {
        validator: false
    }
};
