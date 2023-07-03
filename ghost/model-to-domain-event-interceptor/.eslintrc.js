module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['ghost', '@typescript-eslint'],
    extends: [
        'plugin:ghost/node'
    ],
    rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error']
    }
};
