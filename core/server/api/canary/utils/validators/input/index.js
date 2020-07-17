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

    get members() {
        return require('./members');
    },

    get settings() {
        return require('./settings');
    },

    get tags() {
        return require('./tags');
    },

    get labels() {
        return require('./labels');
    },

    get users() {
        return require('./users');
    },

    get images() {
        return require('./images');
    },

    get oembed() {
        return require('./oembed');
    },

    get webhooks() {
        return require('./webhooks');
    }
};
