const shared = require('../shared');
const localUtils = require('./utils');

// ESLint Override Notice
// This is a valid index.js file - it just exports a lot of stuff!
// Long term we would like to change the API architecture to reduce this file,
// but that's not the problem the index.js max - line eslint "proxy" rule is there to solve.
/* eslint-disable max-lines */

module.exports = {
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
        return shared.pipeline(require('./members-stripe-connect'), localUtils);
    },

    get members() {
        return shared.pipeline(require('./members'), localUtils);
    },

    get offers() {
        return shared.pipeline(require('./offers'), localUtils);
    },

    get tiers() {
        return shared.pipeline(require('./tiers'), localUtils);
    },

    get memberSigninUrls() {
        return shared.pipeline(require('./member-signin-urls.js'), localUtils);
    },

    get labels() {
        return shared.pipeline(require('./labels'), localUtils);
    },

    get images() {
        return shared.pipeline(require('./images'), localUtils);
    },

    get media() {
        return shared.pipeline(require('./media'), localUtils);
    },

    get files() {
        return shared.pipeline(require('./files'), localUtils);
    },

    get tags() {
        return shared.pipeline(require('./tags'), localUtils);
    },

    get users() {
        return shared.pipeline(require('./users'), localUtils);
    },

    get previews() {
        return shared.pipeline(require('./previews'), localUtils);
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

    get email_previews() {
        return shared.pipeline(require('./email-previews'), localUtils);
    },

    get emails() {
        return shared.pipeline(require('./emails'), localUtils);
    },

    get site() {
        return shared.pipeline(require('./site'), localUtils);
    },

    get snippets() {
        return shared.pipeline(require('./snippets'), localUtils);
    },

    get stats() {
        return shared.pipeline(require('./stats'), localUtils);
    },

    get customThemeSettings() {
        return shared.pipeline(require('./custom-theme-settings'), localUtils);
    },

    get serializers() {
        return require('./utils/serializers');
    },

    get newsletters() {
        return shared.pipeline(require('./newsletters'), localUtils);
    },

    /**
     * Content API Controllers
     *
     * @NOTE:
     *
     * Please create separate controllers for Content & Admin API. The goal is to expose `api.content` and
     * `api.admin` soon. Need to figure out how serializers & validation works then.
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

    get tiersPublic() {
        return shared.pipeline(require('./tiers-public'), localUtils, 'content');
    },

    get newslettersPublic() {
        return shared.pipeline(require('./newsletters-public'), localUtils, 'content');
    },

    get offersPublic() {
        return shared.pipeline(require('./offers-public'), localUtils, 'content');
    }
};
