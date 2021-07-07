const express = require('../../../../../shared/express');
const api = require('../../../../api').v3;
const apiMw = require('../../middleware');
const mw = require('./middleware');

const shared = require('../../../shared');

module.exports = function apiRoutes() {
    const router = express.Router('v3 admin');

    // alias delete with del
    router.del = router.delete;

    router.use(apiMw.cors);

    const http = api.http;

    // ## Public
    router.get('/site', mw.publicAdminApi, http(api.site.read));

    // ## Configuration
    router.get('/config', mw.authAdminApi, http(api.config.read));

    // ## Posts
    router.get('/posts', mw.authAdminApi, http(api.posts.browse));
    router.post('/posts', mw.authAdminApi, http(api.posts.add));
    router.get('/posts/:id', mw.authAdminApi, http(api.posts.read));
    router.get('/posts/slug/:slug', mw.authAdminApi, http(api.posts.read));
    router.put('/posts/:id', mw.authAdminApi, http(api.posts.edit));
    router.del('/posts/:id', mw.authAdminApi, http(api.posts.destroy));

    // ## Pages
    router.get('/pages', mw.authAdminApi, http(api.pages.browse));
    router.post('/pages', mw.authAdminApi, http(api.pages.add));
    router.get('/pages/:id', mw.authAdminApi, http(api.pages.read));
    router.get('/pages/slug/:slug', mw.authAdminApi, http(api.pages.read));
    router.put('/pages/:id', mw.authAdminApi, http(api.pages.edit));
    router.del('/pages/:id', mw.authAdminApi, http(api.pages.destroy));

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
    router.get('/settings/:key', mw.authAdminApi, http(api.settings.read));
    router.put('/settings', mw.authAdminApi, http(api.settings.edit));
    router.get('/settings/members/email', http(api.settings.validateMembersEmailUpdate));
    router.post('/settings/members/email', mw.authAdminApi, http(api.settings.updateMembersEmail));
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

    // ## Members
    router.get('/members', mw.authAdminApi, http(api.members.browse));
    router.post('/members', mw.authAdminApi, http(api.members.add));

    router.get('/members/stats', mw.authAdminApi, http(api.members.stats));

    router.get('/members/upload', mw.authAdminApi, http(api.members.exportCSV));
    router.post('/members/upload',
        mw.authAdminApi,
        apiMw.upload.single('membersfile'),
        apiMw.upload.validation({type: 'members'}),
        http(api.members.importCSV)
    );

    router.get('/members/hasActiveStripeSubscriptions', mw.authAdminApi, http(api.members.hasActiveStripeSubscriptions));

    router.get('/members/stripe_connect', mw.authAdminApi, http(api.membersStripeConnect.auth));

    router.get('/members/:id', mw.authAdminApi, http(api.members.read));
    router.put('/members/:id', mw.authAdminApi, http(api.members.edit));
    router.del('/members/:id', mw.authAdminApi, http(api.members.destroy));

    router.put('/members/:id/subscriptions/:subscription_id', mw.authAdminApi, http(api.members.editSubscription));

    router.get('/members/:id/signin_urls', mw.authAdminApi, http(api.memberSigninUrls.read));

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

    router.post('/themes/upload',
        mw.authAdminApi,
        apiMw.upload.single('file'),
        apiMw.upload.validation({type: 'themes'}),
        http(api.themes.upload)
    );

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

    // ## Mail
    router.post('/mail', mw.authAdminApi, http(api.mail.send));
    router.post('/mail/test', mw.authAdminApi, http(api.mail.sendTest));

    // ## Slack
    router.post('/slack/test', mw.authAdminApi, http(api.slack.sendTest));

    // ## Sessions
    router.get('/session', mw.authAdminApi, http(api.session.read));
    // We don't need auth when creating a new session (logging in)
    router.post('/session',
        shared.middlewares.brute.globalBlock,
        shared.middlewares.brute.userLogin,
        http(api.session.add)
    );
    router.del('/session', mw.authAdminApi, http(api.session.delete));

    // ## Identity
    router.get('/identities', mw.authAdminApi, http(api.identities.read));

    // ## Authentication
    router.post('/authentication/passwordreset',
        shared.middlewares.brute.globalReset,
        shared.middlewares.brute.userReset,
        http(api.authentication.generateResetToken)
    );
    router.put('/authentication/passwordreset', shared.middlewares.brute.globalBlock, http(api.authentication.resetPassword));
    router.post('/authentication/invitation', http(api.authentication.acceptInvitation));
    router.get('/authentication/invitation', http(api.authentication.isInvitation));
    router.post('/authentication/setup', http(api.authentication.setup));
    router.put('/authentication/setup', mw.authAdminApi, http(api.authentication.updateSetup));
    router.get('/authentication/setup', http(api.authentication.isSetup));

    // ## Images
    router.post('/images/upload',
        mw.authAdminApi,
        apiMw.upload.single('file'),
        apiMw.upload.validation({type: 'images'}),
        apiMw.normalizeImage,
        http(api.images.upload)
    );

    // ## Invites
    router.get('/invites', mw.authAdminApi, http(api.invites.browse));
    router.get('/invites/:id', mw.authAdminApi, http(api.invites.read));
    router.post('/invites', mw.authAdminApi, http(api.invites.add));
    router.del('/invites/:id', mw.authAdminApi, http(api.invites.destroy));

    // ## Redirects
    // TODO: yaml support has been added to https://github.com/TryGhost/Ghost/issues/11085
    // The `/json` endpoints below are left for backward compatibility. They'll be removed in v4.
    router.get('/redirects/json', mw.authAdminApi, http(api.redirects.download));
    router.post('/redirects/json',
        mw.authAdminApi,
        apiMw.upload.single('redirects'),
        apiMw.upload.validation({type: 'redirects'}),
        http(api.redirects.upload)
    );
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
    router.get('/email_preview/posts/:id', mw.authAdminApi, http(api.email_preview.read));
    router.post('/email_preview/posts/:id', mw.authAdminApi, http(api.email_preview.sendTestEmail));

    // ## Emails
    router.get('/emails/:id', mw.authAdminApi, http(api.emails.read));
    router.put('/emails/:id/retry', mw.authAdminApi, http(api.emails.retry));

    // ## Snippets
    router.get('/snippets', mw.authAdminApi, http(api.snippets.browse));
    router.get('/snippets/:id', mw.authAdminApi, http(api.snippets.read));
    router.post('/snippets', mw.authAdminApi, http(api.snippets.add));
    router.put('/snippets/:id', mw.authAdminApi, http(api.snippets.edit));
    router.del('/snippets/:id', mw.authAdminApi, http(api.snippets.destroy));

    return router;
};
