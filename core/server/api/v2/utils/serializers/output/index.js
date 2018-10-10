module.exports = {
    get pages() {
        return require('./pages');
    },

    get roles() {
        return require('./roles');
    },

    get slugs() {
        return require('./slugs');
    },

    get webhooks() {
        return require('./webhooks');
    },

    get posts() {
        return require('./posts');
    }
};
