/* eslint-env node */
module.exports = {
    root: true,
    plugins: [
        'ghost'
    ],
    extends: [
        'plugin:ghost/ember'
    ],
    rules: {
        // disable linting of `this.get` until there's a reliable autofix
        'ghost/ember/use-ember-get-and-set': 'off'
    },
    globals: {
        validator: false
    }
};
