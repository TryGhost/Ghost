module.exports = {
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/ts-test'
    ],
    env: {
        'vitest-globals/env': true
    },
    rules: {
        'ghost/mocha/no-arrow-functions': 'off'
    }
};
