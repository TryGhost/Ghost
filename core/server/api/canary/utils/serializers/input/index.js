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

    get tags() {
        return require('./tags');
    }
};
