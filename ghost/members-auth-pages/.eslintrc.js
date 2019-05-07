module.exports = {
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/browser',
    ],
    parserOptions: {
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        }
    }
};
