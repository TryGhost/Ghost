const apiFramework = require('@tryghost/api-framework');
const localUtils = require('./utils');

// ESLint Override Notice
// This is a valid index.js file - it just exports a lot of stuff!
// Long term we would like to change the API architecture to reduce this file,
// but that's not the problem the index.js max - line eslint "proxy" rule is there to solve.
/* eslint-disable max-lines */

module.exports = {
    authentication: apiFramework.pipeline(require('./authentication'), localUtils),

    collections: apiFramework.pipeline(require('./collections'), localUtils),

    db: apiFramework.pipeline(require('./db'), localUtils),

    identities: apiFramework.pipeline(require('./identities'), localUtils),

    integrations: apiFramework.pipeline(require('./integrations'), localUtils),

    // @TODO: transform
    session: require('./session'),

    schedules: apiFramework.pipeline(require('./schedules'), localUtils),

    pages: apiFramework.pipeline(require('./pages'), localUtils),

    redirects: apiFramework.pipeline(require('./redirects'), localUtils),

    roles: apiFramework.pipeline(require('./roles'), localUtils),

    slugs: apiFramework.pipeline(require('./slugs'), localUtils),

    webhooks: apiFramework.pipeline(require('./webhooks'), localUtils),

    posts: apiFramework.pipeline(require('./posts'), localUtils),

    mentions: apiFramework.pipeline(require('./mentions'), localUtils),

    invites: apiFramework.pipeline(require('./invites'), localUtils),

    mail: apiFramework.pipeline(require('./mail'), localUtils),

    notifications: apiFramework.pipeline(require('./notifications'), localUtils),

    settings: apiFramework.pipeline(require('./settings'), localUtils),

    announcements: apiFramework.pipeline(require('./announcements'), localUtils),

    membersStripeConnect: apiFramework.pipeline(require('./members-stripe-connect'), localUtils),

    members: apiFramework.pipeline(require('./members'), localUtils),

    offers: apiFramework.pipeline(require('./offers'), localUtils),

    tiers: apiFramework.pipeline(require('./tiers'), localUtils),

    memberSigninUrls: apiFramework.pipeline(require('./member-signin-urls.js'), localUtils),

    labels: apiFramework.pipeline(require('./labels'), localUtils),

    images: apiFramework.pipeline(require('./images'), localUtils),

    media: apiFramework.pipeline(require('./media'), localUtils),

    files: apiFramework.pipeline(require('./files'), localUtils),

    tags: apiFramework.pipeline(require('./tags'), localUtils),

    users: apiFramework.pipeline(require('./users'), localUtils),

    previews: apiFramework.pipeline(require('./previews'), localUtils),

    emailPost: apiFramework.pipeline(require('./email-post'), localUtils),

    oembed: apiFramework.pipeline(require('./oembed'), localUtils),

    slack: apiFramework.pipeline(require('./slack'), localUtils),

    config: apiFramework.pipeline(require('./config'), localUtils),

    explore: apiFramework.pipeline(require('./explore'), localUtils),

    themes: apiFramework.pipeline(require('./themes'), localUtils),

    actions: apiFramework.pipeline(require('./actions'), localUtils),

    email_previews: apiFramework.pipeline(require('./email-previews'), localUtils),

    emails: apiFramework.pipeline(require('./emails'), localUtils),

    site: apiFramework.pipeline(require('./site'), localUtils),

    snippets: apiFramework.pipeline(require('./snippets'), localUtils),

    stats: apiFramework.pipeline(require('./stats'), localUtils),

    customThemeSettings: apiFramework.pipeline(require('./custom-theme-settings'), localUtils),

    serializers: require('./utils/serializers'),

    newsletters: apiFramework.pipeline(require('./newsletters'), localUtils),

    comments: apiFramework.pipeline(require('./comments'), localUtils),

    links: apiFramework.pipeline(require('./links'), localUtils),

    mailEvents: apiFramework.pipeline(require('./mail-events'), localUtils),

    recommendations: apiFramework.pipeline(require('./recommendations'), localUtils),

    incomingRecommendations: apiFramework.pipeline(require('./incoming-recommendations'), localUtils),

    /**
     * Content API Controllers
     *
     * @NOTE:
     *
     * Please create separate controllers for Content & Admin API. The goal is to expose `api.content` and
     * `api.admin` soon. Need to figure out how serializers & validation works then.
     */
    pagesPublic: apiFramework.pipeline(require('./pages-public'), localUtils, 'content'),

    collectionsPublic: apiFramework.pipeline(require('./collections-public'), localUtils),

    tagsPublic: apiFramework.pipeline(require('./tags-public'), localUtils, 'content'),

    publicSettings: apiFramework.pipeline(require('./settings-public'), localUtils, 'content'),

    postsPublic: apiFramework.pipeline(require('./posts-public'), localUtils, 'content'),

    authorsPublic: apiFramework.pipeline(require('./authors-public'), localUtils, 'content'),

    tiersPublic: apiFramework.pipeline(require('./tiers-public'), localUtils, 'content'),

    newslettersPublic: apiFramework.pipeline(require('./newsletters-public'), localUtils, 'content'),

    offersPublic: apiFramework.pipeline(require('./offers-public'), localUtils, 'content'),

    commentsMembers: apiFramework.pipeline(require('./comments-members'), localUtils, 'members'),

    feedbackMembers: apiFramework.pipeline(require('./feedback-members'), localUtils, 'members'),

    recommendationsPublic: apiFramework.pipeline(require('./recommendations-public'), localUtils, 'content')
};
