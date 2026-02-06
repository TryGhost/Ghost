module.exports = {
    plugins: ['ghost'],
    extends: [
        'plugin:ghost/ts-test'
    ],
    rules: {
        // We aren't using Mocha so we can disable some Ghost test rules.
        'ghost/mocha/no-mocha-arrows': 'off'
    }
};
