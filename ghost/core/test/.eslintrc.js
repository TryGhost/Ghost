module.exports = {
    env: {
        es6: true,
        node: true,
        mocha: true
    },
    plugins: [
        'ghost'
    ],
    extends: [
        'eslint:recommended',
        'plugin:ghost/test'
    ],
    rules: {
        // TODO: remove this rule once it's turned into "error" in the base plugin
        'no-shadow': 'error',

        // these rules were were not previously enforced in our custom rules,
        // they're turned off here because they _are_ enforced in our plugin.
        // TODO: remove these custom rules and fix the problems in test files where appropriate
        camelcase: 'off',
        'no-prototype-builtins': 'off',
        'no-unused-vars': 'off',
        'no-useless-escape': 'off',

        'ghost/mocha/no-skipped-tests': 'error',

        // TODO: remove these custom rules and fix problems in test files
        'ghost/mocha/max-top-level-suites': 'off',
        'ghost/mocha/no-identical-title': 'off',
        'ghost/mocha/no-setup-in-describe': 'off',
        'ghost/mocha/no-sibling-hooks': 'off'
    }
};
