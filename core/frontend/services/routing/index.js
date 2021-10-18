const registry = require('./registry');
const RouterManager = require('./bootstrap');
const routerManager = new RouterManager({registry});

module.exports = {
    bootstrap: routerManager,

    get registry() {
        return require('./registry');
    },

    get helpers() {
        return require('./helpers');
    },

    get CollectionRouter() {
        return require('./CollectionRouter');
    },

    get TaxonomyRouter() {
        return require('./TaxonomyRouter');
    }
};
