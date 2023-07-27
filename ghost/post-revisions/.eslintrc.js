module.exports = {
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/ts'
    ],
    rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
    }
};
