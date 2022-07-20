// ESLint Override Notice
// This is a valid index.js file - it just exports a lot of stuff!
// Long term we would like to change the API architecture to reduce this file,
// but that's not the problem the index.js max - line eslint "proxy" rule is there to solve.
/* eslint-disable max-lines */

module.exports = {
    get password_reset() {
        return require('./password_reset');
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

    get tiers() {
        return require('./tiers');
    },

    get media() {
        return require('./media');
    },

    get files() {
        return require('./files');
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
    },

    get snippets() {
        return require('./snippets');
    }
};
