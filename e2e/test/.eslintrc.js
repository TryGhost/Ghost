module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/ts-test'
    ],
    rules: {
        'no-console': 'off'
    }
};
