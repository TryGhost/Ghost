const shared = require('../shared');
const localUtils = require('./utils');

module.exports = {
    get http() {
        return shared.http;
    },

    // @TODO: transform
    get session() {
        return require('./session');
    },

    get pages() {
        return shared.pipeline(require('./pages'), localUtils);
    },

    get roles() {
        return shared.pipeline(require('./roles'), localUtils);
    },

    get slugs() {
        return shared.pipeline(require('./slugs'), localUtils);
    },

    get webhooks() {
        return shared.pipeline(require('./webhooks'), localUtils);
    },

    get posts() {
        return shared.pipeline(require('./posts'), localUtils);
    },

    get invites() {
        return shared.pipeline(require('./invites'), localUtils);
    },

    get mail() {
        return shared.pipeline(require('./mail'), localUtils);
    },

    get notifications() {
        return shared.pipeline(require('./notifications'), localUtils);
    },

    get settings() {
        return shared.pipeline(require('./settings'), localUtils);
    },

    get subscribers() {
        return shared.pipeline(require('./subscribers'), localUtils);
    }
};
