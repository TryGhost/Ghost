module.exports = {
    get db() {
        return require('./db');
    },

    get integrations() {
        return require('./integrations');
    },

    get pages() {
        return require('./pages');
    },

    get posts() {
        return require('./posts');
    },

    get settings() {
        return require('./settings');
    },

    get users() {
        return require('./users');
    },

    get authors() {
        return require('./authors');
    },

    get tags() {
        return require('./tags');
    },

    get members() {
        return require('./members');
    },

    get media() {
        return require('./media');
    },

    get tiers() {
        return require('./tiers');
    },

    get webhooks() {
        return require('./webhooks');
    }
};
