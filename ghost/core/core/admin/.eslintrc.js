/* eslint-env node */
module.exports = {
    root: true,
    parser: '@babel/eslint-parser',
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        allowImportExportEverywhere: false,
        ecmaFeatures: {
            globalReturn: false,
            legacyDecorators: true
        },
        requireConfigFile: false,
        babelOptions: {
            plugins: ['@babel/plugin-proposal-class-properties', ['@babel/plugin-proposal-decorators', {legacy: true}]]
        }
    },
    plugins: [
        'ghost'
    ],
    extends: [
        'plugin:ghost/ember'
    ],
    rules: {
        'no-shadow': ['error'],

        // TODO: migrate away from accessing controller in routes
        'ghost/ember/no-controller-access-in-routes': 'off',

        // TODO: enable once we're fully on octane 🏎
        'ghost/ember/no-assignment-of-untracked-properties-used-in-tracking-contexts': 'off',
        'ghost/ember/no-actions-hash': 'off',
        'ghost/ember/no-classic-classes': 'off',
        'ghost/ember/no-classic-components': 'off',
        'ghost/ember/require-tagless-components': 'off',
        'ghost/ember/no-component-lifecycle-hooks': 'off',

        // disable linting of `this.get` until there's a reliable autofix
        'ghost/ember/use-ember-get-and-set': 'off',

        // disable linting of mixins until we migrate away
        'ghost/ember/no-mixins': 'off',
        'ghost/ember/no-new-mixins': 'off'
    }
};
