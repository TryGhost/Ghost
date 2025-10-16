module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/ts-test'
    ],
    rules: {
        // Disable all mocha rules from ghost plugin since this package uses playwright instead
        'ghost/mocha/no-exclusive-tests': 'off',
        'ghost/mocha/no-pending-tests': 'off',
        'ghost/mocha/no-skipped-tests': 'off',
        'ghost/mocha/handle-done-callback': 'off',
        'ghost/mocha/no-synchronous-tests': 'off',
        'ghost/mocha/no-global-tests': 'off',
        'ghost/mocha/no-return-and-callback': 'off',
        'ghost/mocha/no-return-from-async': 'off',
        'ghost/mocha/valid-test-description': 'off',
        'ghost/mocha/valid-suite-description': 'off',
        'ghost/mocha/no-mocha-arrows': 'off',
        'ghost/mocha/no-hooks': 'off',
        'ghost/mocha/no-hooks-for-single-case': 'off',
        'ghost/mocha/no-sibling-hooks': 'off',
        'ghost/mocha/no-top-level-hooks': 'off',
        'ghost/mocha/no-identical-title': 'off',
        'ghost/mocha/max-top-level-suites': 'off',
        'ghost/mocha/no-nested-tests': 'off',
        'ghost/mocha/no-setup-in-describe': 'off',
        'ghost/mocha/prefer-arrow-callback': 'off',
        'ghost/mocha/no-async-describe': 'off'
    },
    overrides: [
        {
            // Only apply filename rule to files containing 'test' in their name
            files: ['*test*'],
            rules: {
                // Enforce kebab-case (lowercase with hyphens) for test filenames
                'ghost/filenames/match-regex': ['error', '^[a-z0-9.-]+$', true]
            }
        }
    ]
};
