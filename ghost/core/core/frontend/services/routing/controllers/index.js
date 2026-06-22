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

    get previews() {
        return require('./previews');
    },

    get giftLinks() {
        return require('./gift-links');
    },

    get email() {
        return require('./email-post');
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
