module.exports = {
    get posts() {
        return require('./posts');
    },

    get invites() {
        return require('./invites');
    },

    get settings() {
        return require('./settings');
    },

    get users() {
        return require('./users');
    }
};
