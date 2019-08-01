module.exports = {
    get passwordreset() {
        return require('./passwordreset');
    },

    get setup() {
        return require('./setup');
    },

    get posts() {
        return require('./posts');
    },

    get pages() {
        return require('./pages');
    },

    get invites() {
        return require('./invites');
    },

    get invitations() {
        return require('./invitations');
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
    },

    get oembed() {
        return require('./oembed');
    }
};
