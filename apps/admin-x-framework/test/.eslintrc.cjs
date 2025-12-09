module.exports = {
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/ts-test'
    ],
    rules: {
        'ghost/mocha/no-mocha-arrows': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        // Enforce kebab-case (lowercase with hyphens) for all filenames
        'ghost/filenames/match-regex': ['error', '^[a-z0-9.-]+$', false]
    }
};
