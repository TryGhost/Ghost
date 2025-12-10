module.exports = {
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/test'
    ],
    rules: {
        // Enforce kebab-case (lowercase with hyphens) for all filenames
        'ghost/filenames/match-regex': ['error', '^[a-z0-9.-]+$', false]
    }
};
