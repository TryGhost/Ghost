module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/ts-test'
    ],
    rules: {
        'no-console': 'off'
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

