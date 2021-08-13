const shared = require('../shared');
const localUtils = require('./utils');

// ESLint Override Notice
// This is a valid index.js file - it just exports a lot of stuff!
// Long term we would like to change the API architecture to reduce this file,
// but that's not the problem the index.js max - line eslint "proxy" rule is there to solve.
/* eslint-disable max-lines */

module.exports = {
    get http() {
        return shared.http;
    },

    get authentication() {
        return shared.pipeline(require('./authentication'), localUtils);
    },

    get db() {
        return shared.pipeline(require('./db'), localUtils);
    },

    get identities() {
        return shared.pipeline(require('./identities'), localUtils);
    },

    get integrations() {
        return shared.pipeline(require('./integrations'), localUtils);
    },

    // @TODO: transform
    get session() {
        return require('./session');
    },

    get schedules() {
        return shared.pipeline(require('./schedules'), localUtils);
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

    get membersStripeConnect() {
        return shared.pipeline(require('./membersStripeConnect'), localUtils);
    },

    get members() {
        return shared.pipeline(require('./members'), localUtils);
    },

    get products() {
        return shared.pipeline(require('./products'), localUtils);
    },

    get memberSigninUrls() {
        return shared.pipeline(require('./memberSigninUrls.js'), localUtils);
    },

    get labels() {
        return shared.pipeline(require('./labels'), localUtils);
    },

    get images() {
        return shared.pipeline(require('./images'), localUtils);
    },

    get tags() {
        return shared.pipeline(require('./tags'), localUtils);
    },

    get users() {
        return shared.pipeline(require('./users'), localUtils);
    },

    get preview() {
        return shared.pipeline(require('./preview'), localUtils);
    },

    get emailPost() {
        return shared.pipeline(require('./email-post'), localUtils);
    },

    get oembed() {
        return shared.pipeline(require('./oembed'), localUtils);
    },

    get slack() {
        return shared.pipeline(require('./slack'), localUtils);
    },

    get config() {
        return shared.pipeline(require('./config'), localUtils);
    },

    get themes() {
        return shared.pipeline(require('./themes'), localUtils);
    },

    get actions() {
        return shared.pipeline(require('./actions'), localUtils);
    },

    get email_preview() {
        return shared.pipeline(require('./email-preview'), localUtils);
    },

    get emails() {
        return shared.pipeline(require('./email'), localUtils);
    },

    get site() {
        return shared.pipeline(require('./site'), localUtils);
    },

    get snippets() {
        return shared.pipeline(require('./snippets'), localUtils);
    },

    get serializers() {
        return require('./utils/serializers');
    },

    /**
     * Content API Controllers
     *
     * @NOTE:
     *
     * Please create separate controllers for Content & Admin API. The goal is to expose `api.canary.content` and
     * `api.canary.admin` soon. Need to figure out how serializers & validation works then.
     */
    get pagesPublic() {
        return shared.pipeline(require('./pages-public'), localUtils, 'content');
    },

    get tagsPublic() {
        return shared.pipeline(require('./tags-public'), localUtils, 'content');
    },

    get publicSettings() {
        return shared.pipeline(require('./settings-public'), localUtils, 'content');
    },

    get postsPublic() {
        return shared.pipeline(require('./posts-public'), localUtils, 'content');
    },

    get authorsPublic() {
        return shared.pipeline(require('./authors-public'), localUtils, 'content');
    },

    get productsPublic() {
        return shared.pipeline(require('./products-public'), localUtils, 'content');
    }
};
