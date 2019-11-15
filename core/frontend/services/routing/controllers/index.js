module.exports = {
    get entry() {
        return require('./entry');
    },

    get collection() {
        return require('./collection');
    },

    get rss() {
        return require('./rss');
    },

    get preview() {
        return require('./preview');
    },

    get channel() {
        return require('./channel');
    },

    get static() {
        return require('./static');
    },

    get unsubscribe() {
        return require('./unsubscribe');
    }
};
