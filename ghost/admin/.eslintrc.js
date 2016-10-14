module.exports = {
    root: true,
    parserOptions: {
        ecmaVersion: 6,
        sourceType: 'module'
    },
    extends: [
        'eslint:recommended',
        'plugin:ember-suave/recommended'
    ],
    env: {
        browser: true
    },
    rules: {
        indent: ['error', 4],
        'space-before-function-paren': ['error', {anonymous: 'ignore', named: 'never'}],
        'object-curly-spacing': ['error', 'never'],
        'array-bracket-spacing': ['error', 'never'],
        'key-spacing': ['error', {mode: 'minimum'}],
        'keyword-spacing': ['error', {overrides: {
            'catch': {'after': true}
        }}],
        'ember-suave/require-access-in-comments': 'off'
    },
    globals: {
        moment: false,
        validator: false
    }
};
