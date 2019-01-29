const shared = require('../shared');
const localUtils = require('./utils');

module.exports = {
    get http() {
        return shared.http;
    },

    get db() {
        return shared.pipeline(require('./db'), localUtils);
    },

    get integrations() {
        return shared.pipeline(require('./integrations'), localUtils);
    },

    // @TODO: transform
    get session() {
        return require('./session');
    },

    get pages() {
        return shared.pipeline(require('./pages'), localUtils);
    },

    get redirects() {
        return shared.pipeline(require('./redirects'), localUtils);
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
    },

    get members() {
        return shared.pipeline(require('./members'), localUtils);
    },

    get upload() {
        return shared.pipeline(require('./upload'), localUtils);
    },

    get tags() {
        return shared.pipeline(require('./tags'), localUtils);
    },

    get tagsPublic() {
        return shared.pipeline(require('./tags-public'), localUtils);
    },

    get users() {
        return shared.pipeline(require('./users'), localUtils);
    },

    get preview() {
        return shared.pipeline(require('./preview'), localUtils);
    },

    get oembed() {
        return shared.pipeline(require('./oembed'), localUtils);
    },

    get slack() {
        return shared.pipeline(require('./slack'), localUtils);
    },

    get authors() {
        return shared.pipeline(require('./authors'), localUtils);
    },

    get configuration() {
        return shared.pipeline(require('./configuration'), localUtils);
    },

    get publicSettings() {
        return shared.pipeline(require('./settings-public'), localUtils);
    },

    get themes() {
        return shared.pipeline(require('./themes'), localUtils);
    },

    get actions() {
        return shared.pipeline(require('./actions'), localUtils);
    }
};
