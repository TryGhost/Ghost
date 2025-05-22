const playwright = require('eslint-plugin-playwright');

module.exports = {
    parser: '@typescript-eslint/parser',
    plugins: ['ghost', 'playwright'],
    extends: [
        'plugin:ghost/ts',
        'plugin:playwright/recommended'
    ]
};