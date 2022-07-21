module.exports = {
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/test'
    ],
    // TODO: why is this needed for async/await? Check eslint-plugin-ghost
    parserOptions: {
        ecmaVersion: 2017
    }
};
