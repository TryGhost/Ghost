module.exports = {
    get posts() {
        return require('./posts');
    },

    get pages() {
        return require('./pages');
    },

    get invites() {
        return require('./invites');
    },

    get settings() {
        return require('./settings');
    },

    get tags() {
        return require('./tags');
    },

    get users() {
        return require('./users');
    },

    get images() {
        return require('./images');
    }
};
