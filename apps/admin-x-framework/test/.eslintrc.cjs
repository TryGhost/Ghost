module.exports = {
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/ts-test'
    ],
    rules: {
        'ghost/mocha/no-mocha-arrows': 'off',
        '@typescript-eslint/no-explicit-any': 'off'
    }
};
