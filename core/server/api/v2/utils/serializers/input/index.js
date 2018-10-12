module.exports = {
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
    }
};
