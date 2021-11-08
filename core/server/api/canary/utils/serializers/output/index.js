// ESLint Override Notice
// This is a valid index.js file - it just exports a lot of stuff!
// Long term we would like to change the API architecture to reduce this file,
// but that's not the problem the index.js max - line eslint "proxy" rule is there to solve.
/* eslint-disable max-lines */

module.exports = {
    get all() {
        return require('./all');
    },

    get authentication() {
        return require('./authentication');
    },

    get db() {
        return require('./db');
    },

    get integrations() {
        return require('./integrations');
    },

    get pages() {
        return require('./pages');
    },

    get redirects() {
        return require('./redirects');
    },

    get roles() {
        return require('./roles');
    },

    get slugs() {
        return require('./slugs');
    },

    get schedules() {
        return require('./schedules');
    },

    get webhooks() {
        return require('./webhooks');
    },

    get posts() {
        return require('./posts');
    },

    get invites() {
        return require('./invites');
    },

    get settings() {
        return require('./settings');
    },

    get notifications() {
        return require('./notifications');
    },

    get mail() {
        return require('./mail');
    },

    get members() {
        return require('./members');
    },

    get products() {
        return require('./products');
    },

    get member_signin_urls() {
        return require('./member-signin_urls');
    },

    get identities() {
        return require('./identities');
    },

    get images() {
        return require('./images');
    },

    get media() {
        return require('./media');
    },

    get files() {
        return require('./files');
    },

    get tags() {
        return require('./tags');
    },

    get users() {
        return require('./users');
    },

    get preview() {
        return require('./preview');
    },

    get email_post() {
        return require('./email-posts');
    },

    get oembed() {
        return require('./oembed');
    },

    get authors() {
        return require('./authors');
    },

    get config() {
        return require('./config');
    },

    get themes() {
        return require('./themes');
    },

    get actions() {
        return require('./actions');
    },

    get site() {
        return require('./site');
    },

    get email_preview() {
        return require('./email-preview');
    },

    get emails() {
        return require('./emails');
    },

    get labels() {
        return require('./labels');
    },

    get snippets() {
        return require('./snippets');
    },

    get custom_theme_settings() {
        return require('./custom-theme-settings');
    }
};
