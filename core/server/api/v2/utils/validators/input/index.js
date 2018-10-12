module.exports = {
    get posts() {
        return require('./posts');
    },

    get settings() {
        return require('./settings');
    }
};
