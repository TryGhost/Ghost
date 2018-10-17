module.exports = {
    get integrations() {
        return require('./integrations');
    },

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
    },

    get invites() {
        return require('./invites');
    },

    get settings() {
        return require('./settings');
    },

    get notifications() {
        return require('./notifications');
    },

    get mail() {
        return require('./mail');
    },

    get subscribers() {
        return require('./subscribers');
    },

    get upload() {
        return require('./upload');
    },

    get tags() {
        return require('./tags');
    },

    get users() {
        return require('./users');
    },

    get preview() {
        return require('./preview');
    }
};
