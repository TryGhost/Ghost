module.exports = {
    parser: '@babel/eslint-parser',
    parserOptions: {
        requireConfigFile: false
    },
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/node'
    ]
};
