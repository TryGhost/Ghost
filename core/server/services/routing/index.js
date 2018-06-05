module.exports = {
    get bootstrap() {
        return require('./bootstrap');
    },

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
