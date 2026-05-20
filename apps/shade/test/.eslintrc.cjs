module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['ghost'],
    env: {
        browser: true
    },
    extends: [
        'plugin:ghost/ts-test'
    ],
    rules: {
        // Enforce a kebab-case (lowercase with hyphens) for all filenames
        'ghost/filenames/match-regex': ['error', '^[a-z0-9.-]+$', false]
    }
};
