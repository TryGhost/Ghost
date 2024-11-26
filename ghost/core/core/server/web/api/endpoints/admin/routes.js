const express = require('../../../../../shared/express');
const api = require('../../../../api').endpoints;
const {http} = require('@tryghost/api-framework');
const apiMw = require('../../middleware');
const mw = require('./middleware');

const shared = require('../../../shared');
const labs = require('../../../../../shared/labs');

/**
 * @returns {import('express').Router}
 */
module.exports = function apiRoutes() {
    const router = express.Router('admin api');

    // alias delete with del
    router.del = router.delete;

    router.use(apiMw.cors);

    // ## Public
    router.get('/site', mw.publicAdminApi, http(api.site.read));
    router.post('/mail_events', mw.publicAdminApi, http(api.mailEvents.add));

    // ## Collections
    router.get('/collections', mw.authAdminApi, http(api.collections.browse));
    router.get('/collections/:id', mw.authAdminApi, http(api.collections.read));
    router.get('/collections/slug/:slug', mw.authAdminApi, http(api.collections.read));
    router.post('/collections', mw.authAdminApi, labs.enabledMiddleware('collections'), http(api.collections.add));
    router.put('/collections/:id', mw.authAdminApi, labs.enabledMiddleware('collections'), http(api.collections.edit));
    router.del('/collections/:id', mw.authAdminApi, labs.enabledMiddleware('collections'), http(api.collections.destroy));

    // ## Configuration
    router.get('/config', mw.authAdminApi, http(api.config.read));

    // ## Ghost Explore
    router.get('/explore', mw.authAdminApi, http(api.explore.read));

    // ## Posts
    router.get('/posts', mw.authAdminApi, http(api.posts.browse));
    router.get('/posts/export', mw.authAdminApi, http(api.posts.exportCSV));

    router.post('/posts', mw.authAdminApi, http(api.posts.add));
    router.del('/posts', mw.authAdminApi, http(api.posts.bulkDestroy));
    router.put('/posts/bulk', mw.authAdminApi, http(api.posts.bulkEdit));
    router.get('/posts/:id', mw.authAdminApi, http(api.posts.read));
    router.get('/posts/slug/:slug', mw.authAdminApi, http(api.posts.read));
    router.put('/posts/:id', mw.authAdminApi, http(api.posts.edit));
    router.del('/posts/:id', mw.authAdminApi, http(api.posts.destroy));
    router.post('/posts/:id/copy', mw.authAdminApi, http(api.posts.copy));

    router.get('/mentions', mw.authAdminApi, http(api.mentions.browse));

    router.get('/comments/:id', mw.authAdminApi, http(api.commentReplies.read));
    router.get('/comments/:id/replies', mw.authAdminApi, http(api.commentReplies.browse));
    router.get('/comments/post/:post_id', mw.authAdminApi, http(api.comments.browse));
    router.put('/comments/:id', mw.authAdminApi, http(api.comments.edit));

    // ## Pages
    router.get('/pages', mw.authAdminApi, http(api.pages.browse));
    router.del('/pages', mw.authAdminApi, http(api.pages.bulkDestroy));
    router.put('/pages/bulk', mw.authAdminApi, http(api.pages.bulkEdit));
    router.post('/pages', mw.authAdminApi, http(api.pages.add));
    router.get('/pages/:id', mw.authAdminApi, http(api.pages.read));
    router.get('/pages/slug/:slug', mw.authAdminApi, http(api.pages.read));
    router.put('/pages/:id', mw.authAdminApi, http(api.pages.edit));
    router.del('/pages/:id', mw.authAdminApi, http(api.pages.destroy));
    router.post('/pages/:id/copy', mw.authAdminApi, http(api.pages.copy));

    // # Integrations

    router.get('/integrations', mw.authAdminApi, http(api.integrations.browse));
    router.get('/integrations/:id', mw.authAdminApi, http(api.integrations.read));
    router.post('/integrations', mw.authAdminApi, http(api.integrations.add));
    router.post('/integrations/:id/api_key/:keyid/refresh', mw.authAdminApi, http(api.integrations.edit));
    router.put('/integrations/:id', mw.authAdminApi, http(api.integrations.edit));
    router.del('/integrations/:id', mw.authAdminApi, http(api.integrations.destroy));

    // ## Schedules
    router.put('/schedules/:resource/:id', mw.authAdminApiWithUrl, http(api.schedules.publish));

    // ## Settings
    router.get('/settings/routes/yaml', mw.authAdminApi, http(api.settings.download));
    router.post('/settings/routes/yaml',
        mw.authAdminApi,
        apiMw.upload.single('routes'),
        apiMw.upload.validation({type: 'routes'}),
        http(api.settings.upload)
    );

    router.get('/settings', mw.authAdminApi, http(api.settings.browse));
    router.put('/settings', mw.authAdminApi, http(api.settings.edit));
    router.put('/settings/verifications/', mw.authAdminApi, http(api.settings.verifyKeyUpdate));
    router.del('/settings/stripe/connect', mw.authAdminApi, http(api.settings.disconnectStripeConnectIntegration));

    // ## Users
    router.get('/users', mw.authAdminApi, http(api.users.browse));
    router.get('/users/:id', mw.authAdminApi, http(api.users.read));
    router.get('/users/slug/:slug', mw.authAdminApi, http(api.users.read));
    // NOTE: We don't expose any email addresses via the public api.
    router.get('/users/email/:email', mw.authAdminApi, http(api.users.read));
    router.get('/users/:id/token', mw.authAdminApi, http(api.users.readToken));

    router.put('/users/password', mw.authAdminApi, http(api.users.changePassword));
    router.put('/users/owner', mw.authAdminApi, http(api.users.transferOwnership));
    router.put('/users/:id', mw.authAdminApi, http(api.users.edit));
    router.put('/users/:id/token', mw.authAdminApi, http(api.users.regenerateToken));
    router.del('/users/:id', mw.authAdminApi, http(api.users.destroy));

    // ## Tags
    router.get('/tags', mw.authAdminApi, http(api.tags.browse));
    router.get('/tags/:id', mw.authAdminApi, http(api.tags.read));
    router.get('/tags/slug/:slug', mw.authAdminApi, http(api.tags.read));
    router.post('/tags', mw.authAdminApi, http(api.tags.add));
    router.put('/tags/:id', mw.authAdminApi, http(api.tags.edit));
    router.del('/tags/:id', mw.authAdminApi, http(api.tags.destroy));

    // Tiers
    router.get('/tiers', mw.authAdminApi, http(api.tiers.browse));
    router.post('/tiers', mw.authAdminApi, http(api.tiers.add));
    router.get('/tiers/:id', mw.authAdminApi, http(api.tiers.read));
    router.put('/tiers/:id', mw.authAdminApi, http(api.tiers.edit));

    // ## Members
    router.get('/members', mw.authAdminApi, http(api.members.browse));
    router.post('/members', mw.authAdminApi, http(api.members.add));
    router.del('/members', mw.authAdminApi, http(api.members.bulkDestroy));
    router.put('/members/bulk', mw.authAdminApi, http(api.members.bulkEdit));

    router.get('/offers', mw.authAdminApi, http(api.offers.browse));
    router.post('/offers', mw.authAdminApi, http(api.offers.add));
    router.get('/offers/:id', mw.authAdminApi, http(api.offers.read));
    router.put('/offers/:id', mw.authAdminApi, http(api.offers.edit));

    router.get('/members/stats/count', mw.authAdminApi, http(api.members.memberStats));
    router.get('/members/stats/mrr', mw.authAdminApi, http(api.members.mrrStats));

    router.get('/members/events', mw.authAdminApi, http(api.members.activityFeed));

    router.get('/members/upload', mw.authAdminApi, http(api.members.exportCSV));
    router.post('/members/upload',
        mw.authAdminApi,
        apiMw.upload.single('membersfile'),
        apiMw.upload.validation({type: 'members'}),
        http(api.members.importCSV)
    );

    router.get('/members/stripe_connect', mw.authAdminApi, http(api.membersStripeConnect.auth));

    router.get('/members/:id', mw.authAdminApi, http(api.members.read));
    router.put('/members/:id', mw.authAdminApi, http(api.members.edit));
    router.del('/members/:id', mw.authAdminApi, http(api.members.destroy));
    router.del('/members/:id/sessions', mw.authAdminApi, http(api.members.logout));

    router.post('/members/:id/subscriptions/', mw.authAdminApi, http(api.members.createSubscription));
    router.put('/members/:id/subscriptions/:subscription_id', mw.authAdminApi, http(api.members.editSubscription));

    router.get('/members/:id/signin_urls', mw.authAdminApi, http(api.memberSigninUrls.read));

    // ## Stats
    router.get('/stats/member_count', mw.authAdminApi, http(api.stats.memberCountHistory));
    router.get('/stats/mrr', mw.authAdminApi, http(api.stats.mrr));
    router.get('/stats/subscriptions', mw.authAdminApi, http(api.stats.subscriptions));
    router.get('/stats/referrers/posts/:id', mw.authAdminApi, http(api.stats.postReferrers));
    router.get('/stats/referrers', mw.authAdminApi, http(api.stats.referrersHistory));

    // ## Labels
    router.get('/labels', mw.authAdminApi, http(api.labels.browse));
    router.get('/labels/:id', mw.authAdminApi, http(api.labels.read));
    router.get('/labels/slug/:slug', mw.authAdminApi, http(api.labels.read));
    router.post('/labels', mw.authAdminApi, http(api.labels.add));
    router.put('/labels/:id', mw.authAdminApi, http(api.labels.edit));
    router.del('/labels/:id', mw.authAdminApi, http(api.labels.destroy));

    // ## Roles
    router.get('/roles/', mw.authAdminApi, http(api.roles.browse));

    // ## Slugs
    router.get('/slugs/:type/:name', mw.authAdminApi, http(api.slugs.generate));

    // ## Themes
    router.get('/themes/', mw.authAdminApi, http(api.themes.browse));

    router.get('/themes/:name/download',
        mw.authAdminApi,
        http(api.themes.download)
    );

    router.get('/themes/active',
        mw.authAdminApi,
        http(api.themes.readActive)
    );

    router.post('/themes/upload',
        mw.authAdminApi,
        apiMw.upload.single('file'),
        apiMw.upload.validation({type: 'themes'}),
        http(api.themes.upload)
    );

    router.post('/themes/install', mw.authAdminApi, http(api.themes.install));

    router.put('/themes/:name/activate',
        mw.authAdminApi,
        http(api.themes.activate)
    );

    router.del('/themes/:name',
        mw.authAdminApi,
        http(api.themes.destroy)
    );

    // ## Notifications
    router.get('/notifications', mw.authAdminApi, http(api.notifications.browse));
    router.post('/notifications', mw.authAdminApi, http(api.notifications.add));
    router.del('/notifications/:notification_id', mw.authAdminApi, http(api.notifications.destroy));

    // ## DB
    router.get('/db', mw.authAdminApi, http(api.db.exportContent));
    router.post('/db',
        mw.authAdminApi,
        apiMw.upload.single('importfile'),
        apiMw.upload.validation({type: 'db'}),
        http(api.db.importContent)
    );
    router.del('/db', mw.authAdminApi, http(api.db.deleteAllContent));
    router.post('/db/backup',
        mw.authAdminApi,
        http(api.db.backupContent)
    );

    router.post('/db/media/inline',
        mw.authAdminApi,
        http(api.db.inlineMedia)
    );

    // ## Slack
    router.post('/slack/test', mw.authAdminApi, http(api.slack.sendTest));

    // ## Sessions
    router.get('/session', mw.authAdminApi, http(api.session.read));
    // We don't need auth when creating a new session (logging in)
    router.post('/session',
        shared.middleware.brute.globalBlock,
        shared.middleware.brute.userLogin,
        http(api.session.add)
    );
    router.del('/session', mw.authAdminApi, http(api.session.delete));
    router.post('/session/verify', shared.middleware.brute.sendVerificationCode, http(api.session.sendVerification));
    router.put('/session/verify', shared.middleware.brute.userVerification, http(api.session.verify));

    // ## Identity
    router.get('/identities', mw.authAdminApi, http(api.identities.read));

    // ## Authentication
    router.post('/authentication/password_reset',
        shared.middleware.brute.globalReset,
        shared.middleware.brute.userReset,
        http(api.authentication.generateResetToken)
    );
    router.put('/authentication/password_reset', shared.middleware.brute.globalBlock, http(api.authentication.resetPassword));
    router.post('/authentication/invitation', http(api.authentication.acceptInvitation));
    router.get('/authentication/invitation', http(api.authentication.isInvitation));
    router.post('/authentication/setup', http(api.authentication.setup));
    router.put('/authentication/setup', mw.authAdminApi, http(api.authentication.updateSetup));
    router.get('/authentication/setup', http(api.authentication.isSetup));
    router.post('/authentication/global_password_reset', mw.authAdminApi, http(api.authentication.resetAllPasswords));

    // ## Images
    router.post('/images/upload',
        mw.authAdminApi,
        apiMw.upload.single('file'),
        apiMw.upload.validation({type: 'images'}),
        http(api.images.upload)
    );

    // ## media
    router.post('/media/upload',
        mw.authAdminApi,
        apiMw.upload.media('file', 'thumbnail'),
        apiMw.upload.mediaValidation({type: 'media'}),
        http(api.media.upload)
    );
    router.put('/media/thumbnail/upload',
        mw.authAdminApi,
        apiMw.upload.single('file'),
        apiMw.upload.validation({type: 'images'}),
        http(api.media.uploadThumbnail)
    );

    // ## files
    router.post('/files/upload',
        mw.authAdminApi,
        apiMw.upload.single('file'),
        http(api.files.upload)
    );

    // ## Invites
    router.get('/invites', mw.authAdminApi, http(api.invites.browse));
    router.get('/invites/:id', mw.authAdminApi, http(api.invites.read));
    router.post('/invites', mw.authAdminApi, http(api.invites.add));
    router.del('/invites/:id', mw.authAdminApi, http(api.invites.destroy));

    // ## Redirects
    router.get('/redirects/download', mw.authAdminApi, http(api.redirects.download));
    router.post('/redirects/upload',
        mw.authAdminApi,
        apiMw.upload.single('redirects'),
        apiMw.upload.validation({type: 'redirects'}),
        http(api.redirects.upload)
    );

    // ## Webhooks (RESTHooks)
    router.post('/webhooks', mw.authAdminApi, http(api.webhooks.add));
    router.put('/webhooks/:id', mw.authAdminApi, http(api.webhooks.edit));
    router.del('/webhooks/:id', mw.authAdminApi, http(api.webhooks.destroy));

    // ## Oembed (fetch response from oembed provider)
    router.get('/oembed', mw.authAdminApi, http(api.oembed.read));

    // ## Actions
    router.get('/actions', mw.authAdminApi, http(api.actions.browse));

    // ## Email Preview
    router.get('/email_previews/posts/:id', mw.authAdminApi, http(api.email_previews.read));
    // preview sending have an additional rate limiter to prevent abuse
    router.post('/email_previews/posts/:id', shared.middleware.brute.previewEmailLimiter, mw.authAdminApi, http(api.email_previews.sendTestEmail));

    // ## Emails
    router.get('/emails', mw.authAdminApi, http(api.emails.browse));
    router.get('/emails/:id', mw.authAdminApi, http(api.emails.read));
    router.put('/emails/:id/retry', mw.authAdminApi, http(api.emails.retry));
    router.get('/emails/:id/batches', mw.authAdminApi, http(api.emails.browseBatches));
    router.get('/emails/:id/recipient-failures', mw.authAdminApi, http(api.emails.browseFailures));
    router.get('/emails/:id/analytics', mw.authAdminApi, http(api.emails.analyticsStatus));
    router.put('/emails/:id/analytics', mw.authAdminApi, http(api.emails.scheduleAnalytics));
    router.delete('/emails/analytics', mw.authAdminApi, http(api.emails.cancelScheduledAnalytics));

    // ## Snippets
    router.get('/snippets', mw.authAdminApi, http(api.snippets.browse));
    router.get('/snippets/:id', mw.authAdminApi, http(api.snippets.read));
    router.post('/snippets', mw.authAdminApi, http(api.snippets.add));
    router.put('/snippets/:id', mw.authAdminApi, http(api.snippets.edit));
    router.del('/snippets/:id', mw.authAdminApi, http(api.snippets.destroy));

    // ## Custom theme settings
    router.get('/custom_theme_settings', mw.authAdminApi, http(api.customThemeSettings.browse));
    router.put('/custom_theme_settings', mw.authAdminApi, http(api.customThemeSettings.edit));

    router.get('/newsletters', mw.authAdminApi, http(api.newsletters.browse));
    router.get('/newsletters/:id', mw.authAdminApi, http(api.newsletters.read));
    router.post('/newsletters', mw.authAdminApi, http(api.newsletters.add));
    router.put('/newsletters/verifications/', mw.authAdminApi, http(api.newsletters.verifyPropertyUpdate));
    router.put('/newsletters/:id', mw.authAdminApi, http(api.newsletters.edit));

    router.get('/links', mw.authAdminApi, http(api.links.browse));
    router.put('/links/bulk', mw.authAdminApi, http(api.links.bulkEdit));

    // Recommendations
    router.get('/recommendations', mw.authAdminApi, http(api.recommendations.browse));
    router.get('/recommendations/:id', mw.authAdminApi, http(api.recommendations.read));
    router.post('/recommendations', mw.authAdminApi, http(api.recommendations.add));
    router.post('/recommendations/check', mw.authAdminApi, http(api.recommendations.check));
    router.put('/recommendations/:id', mw.authAdminApi, http(api.recommendations.edit));
    router.del('/recommendations/:id', mw.authAdminApi, http(api.recommendations.destroy));

    // Incoming recommendations
    router.get('/incoming_recommendations', mw.authAdminApi, http(api.incomingRecommendations.browse));

    return router;
};
