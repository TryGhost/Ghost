module.exports = {
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/ts'
    ],
    rules: {
        // TODO: fix + remove this
        '@typescript-eslint/no-explicit-any': 'warn',
    }
};
