const express = require('../../../../../shared/express');
const apiCanary = require('../../../../api/canary');
const apiMw = require('../../middleware');
const mw = require('./middleware');

const shared = require('../../../shared');

module.exports = function apiRoutes() {
    const router = express.Router('canary admin');

    // alias delete with del
    router.del = router.delete;

    router.use(apiMw.cors);

    const http = apiCanary.http;

    // ## Public
    router.get('/site', mw.publicAdminApi, http(apiCanary.site.read));

    // ## Configuration
    router.get('/config', mw.authAdminApi, http(apiCanary.config.read));

    // ## Posts
    router.get('/posts', mw.authAdminApi, http(apiCanary.posts.browse));
    router.post('/posts', mw.authAdminApi, http(apiCanary.posts.add));
    router.get('/posts/:id', mw.authAdminApi, http(apiCanary.posts.read));
    router.get('/posts/slug/:slug', mw.authAdminApi, http(apiCanary.posts.read));
    router.put('/posts/:id', mw.authAdminApi, http(apiCanary.posts.edit));
    router.del('/posts/:id', mw.authAdminApi, http(apiCanary.posts.destroy));

    // ## Pages
    router.get('/pages', mw.authAdminApi, http(apiCanary.pages.browse));
    router.post('/pages', mw.authAdminApi, http(apiCanary.pages.add));
    router.get('/pages/:id', mw.authAdminApi, http(apiCanary.pages.read));
    router.get('/pages/slug/:slug', mw.authAdminApi, http(apiCanary.pages.read));
    router.put('/pages/:id', mw.authAdminApi, http(apiCanary.pages.edit));
    router.del('/pages/:id', mw.authAdminApi, http(apiCanary.pages.destroy));

    // # Integrations

    router.get('/integrations', mw.authAdminApi, http(apiCanary.integrations.browse));
    router.get('/integrations/:id', mw.authAdminApi, http(apiCanary.integrations.read));
    router.post('/integrations', mw.authAdminApi, http(apiCanary.integrations.add));
    router.post('/integrations/:id/api_key/:keyid/refresh', mw.authAdminApi, http(apiCanary.integrations.edit));
    router.put('/integrations/:id', mw.authAdminApi, http(apiCanary.integrations.edit));
    router.del('/integrations/:id', mw.authAdminApi, http(apiCanary.integrations.destroy));

    // ## Schedules
    router.put('/schedules/:resource/:id', mw.authAdminApiWithUrl, http(apiCanary.schedules.publish));

    // ## Settings
    router.get('/settings/routes/yaml', mw.authAdminApi, http(apiCanary.settings.download));
    router.post('/settings/routes/yaml',
        mw.authAdminApi,
        apiMw.upload.single('routes'),
        apiMw.upload.validation({type: 'routes'}),
        http(apiCanary.settings.upload)
    );

    router.get('/settings', mw.authAdminApi, http(apiCanary.settings.browse));
    router.get('/settings/:key', mw.authAdminApi, http(apiCanary.settings.read));
    router.put('/settings', mw.authAdminApi, http(apiCanary.settings.edit));
    router.get('/settings/members/email', http(apiCanary.settings.validateMembersFromEmail));
    router.post('/settings/members/email', mw.authAdminApi, http(apiCanary.settings.updateMembersFromEmail));
    router.del('/settings/stripe/connect', mw.authAdminApi, http(apiCanary.settings.disconnectStripeConnectIntegration));

    // ## Users
    router.get('/users', mw.authAdminApi, http(apiCanary.users.browse));
    router.get('/users/:id', mw.authAdminApi, http(apiCanary.users.read));
    router.get('/users/slug/:slug', mw.authAdminApi, http(apiCanary.users.read));
    // NOTE: We don't expose any email addresses via the public api.
    router.get('/users/email/:email', mw.authAdminApi, http(apiCanary.users.read));

    router.put('/users/password', mw.authAdminApi, http(apiCanary.users.changePassword));
    router.put('/users/owner', mw.authAdminApi, http(apiCanary.users.transferOwnership));
    router.put('/users/:id', mw.authAdminApi, http(apiCanary.users.edit));
    router.del('/users/:id', mw.authAdminApi, http(apiCanary.users.destroy));

    // ## Tags
    router.get('/tags', mw.authAdminApi, http(apiCanary.tags.browse));
    router.get('/tags/:id', mw.authAdminApi, http(apiCanary.tags.read));
    router.get('/tags/slug/:slug', mw.authAdminApi, http(apiCanary.tags.read));
    router.post('/tags', mw.authAdminApi, http(apiCanary.tags.add));
    router.put('/tags/:id', mw.authAdminApi, http(apiCanary.tags.edit));
    router.del('/tags/:id', mw.authAdminApi, http(apiCanary.tags.destroy));

    // ## Members
    router.get('/members', shared.middlewares.labs.members, mw.authAdminApi, http(apiCanary.members.browse));
    router.post('/members', shared.middlewares.labs.members, mw.authAdminApi, http(apiCanary.members.add));

    router.get('/members/stats', shared.middlewares.labs.members, mw.authAdminApi, http(apiCanary.members.stats));

    router.post('/members/upload/validate', shared.middlewares.labs.members, mw.authAdminApi, http(apiCanary.members.validateImport));
    router.get('/members/upload', shared.middlewares.labs.members, mw.authAdminApi, http(apiCanary.members.exportCSV));
    router.post('/members/upload',
        shared.middlewares.labs.members,
        mw.authAdminApi,
        apiMw.upload.single('membersfile'),
        apiMw.upload.validation({type: 'members'}),
        http(apiCanary.members.importCSV)
    );

    router.get('/members/hasActiveStripeSubscriptions', shared.middlewares.labs.members, mw.authAdminApi, http(apiCanary.members.hasActiveStripeSubscriptions));

    router.get('/members/stripe_connect', shared.middlewares.labs.members, mw.authAdminApi, http(apiCanary.membersStripeConnect.auth));

    router.get('/members/:id', shared.middlewares.labs.members, mw.authAdminApi, http(apiCanary.members.read));
    router.put('/members/:id', shared.middlewares.labs.members, mw.authAdminApi, http(apiCanary.members.edit));
    router.del('/members/:id', shared.middlewares.labs.members, mw.authAdminApi, http(apiCanary.members.destroy));

    router.get('/members/:id/signin_urls', shared.middlewares.labs.members, mw.authAdminApi, http(apiCanary.memberSigninUrls.read));

    // ## Labels
    router.get('/labels', mw.authAdminApi, http(apiCanary.labels.browse));
    router.get('/labels/:id', mw.authAdminApi, http(apiCanary.labels.read));
    router.get('/labels/slug/:slug', mw.authAdminApi, http(apiCanary.labels.read));
    router.post('/labels', mw.authAdminApi, http(apiCanary.labels.add));
    router.put('/labels/:id', mw.authAdminApi, http(apiCanary.labels.edit));
    router.del('/labels/:id', mw.authAdminApi, http(apiCanary.labels.destroy));

    // ## Roles
    router.get('/roles/', mw.authAdminApi, http(apiCanary.roles.browse));

    // ## Slugs
    router.get('/slugs/:type/:name', mw.authAdminApi, http(apiCanary.slugs.generate));

    // ## Themes
    router.get('/themes/', mw.authAdminApi, http(apiCanary.themes.browse));

    router.get('/themes/:name/download',
        mw.authAdminApi,
        http(apiCanary.themes.download)
    );

    router.post('/themes/upload',
        mw.authAdminApi,
        apiMw.upload.single('file'),
        apiMw.upload.validation({type: 'themes'}),
        http(apiCanary.themes.upload)
    );

    router.put('/themes/:name/activate',
        mw.authAdminApi,
        http(apiCanary.themes.activate)
    );

    router.del('/themes/:name',
        mw.authAdminApi,
        http(apiCanary.themes.destroy)
    );

    // ## Notifications
    router.get('/notifications', mw.authAdminApi, http(apiCanary.notifications.browse));
    router.post('/notifications', mw.authAdminApi, http(apiCanary.notifications.add));
    router.del('/notifications/:notification_id', mw.authAdminApi, http(apiCanary.notifications.destroy));

    // ## DB
    router.get('/db', mw.authAdminApi, http(apiCanary.db.exportContent));
    router.post('/db',
        mw.authAdminApi,
        apiMw.upload.single('importfile'),
        apiMw.upload.validation({type: 'db'}),
        http(apiCanary.db.importContent)
    );
    router.del('/db', mw.authAdminApi, http(apiCanary.db.deleteAllContent));
    router.post('/db/backup',
        mw.authAdminApi,
        http(apiCanary.db.backupContent)
    );

    // ## Mail
    router.post('/mail', mw.authAdminApi, http(apiCanary.mail.send));
    router.post('/mail/test', mw.authAdminApi, http(apiCanary.mail.sendTest));

    // ## Slack
    router.post('/slack/test', mw.authAdminApi, http(apiCanary.slack.sendTest));

    // ## Sessions
    router.get('/session', mw.authAdminApi, http(apiCanary.session.read));
    // We don't need auth when creating a new session (logging in)
    router.post('/session',
        shared.middlewares.brute.globalBlock,
        shared.middlewares.brute.userLogin,
        http(apiCanary.session.add)
    );
    router.del('/session', mw.authAdminApi, http(apiCanary.session.delete));

    // ## Identity
    router.get('/identities', mw.authAdminApi, http(apiCanary.identities.read));

    // ## Authentication
    router.post('/authentication/passwordreset',
        shared.middlewares.brute.globalReset,
        shared.middlewares.brute.userReset,
        http(apiCanary.authentication.generateResetToken)
    );
    router.put('/authentication/passwordreset', shared.middlewares.brute.globalBlock, http(apiCanary.authentication.resetPassword));
    router.post('/authentication/invitation', http(apiCanary.authentication.acceptInvitation));
    router.get('/authentication/invitation', http(apiCanary.authentication.isInvitation));
    router.post('/authentication/setup', http(apiCanary.authentication.setup));
    router.put('/authentication/setup', mw.authAdminApi, http(apiCanary.authentication.updateSetup));
    router.get('/authentication/setup', http(apiCanary.authentication.isSetup));

    // ## Images
    router.post('/images/upload',
        mw.authAdminApi,
        apiMw.upload.single('file'),
        apiMw.upload.validation({type: 'images'}),
        apiMw.normalizeImage,
        http(apiCanary.images.upload)
    );

    // ## Invites
    router.get('/invites', mw.authAdminApi, http(apiCanary.invites.browse));
    router.get('/invites/:id', mw.authAdminApi, http(apiCanary.invites.read));
    router.post('/invites', mw.authAdminApi, http(apiCanary.invites.add));
    router.del('/invites/:id', mw.authAdminApi, http(apiCanary.invites.destroy));

    // ## Redirects (JSON based)
    router.get('/redirects/json', mw.authAdminApi, http(apiCanary.redirects.download));
    router.post('/redirects/json',
        mw.authAdminApi,
        apiMw.upload.single('redirects'),
        apiMw.upload.validation({type: 'redirects'}),
        http(apiCanary.redirects.upload)
    );

    // ## Webhooks (RESTHooks)
    router.post('/webhooks', mw.authAdminApi, http(apiCanary.webhooks.add));
    router.put('/webhooks/:id', mw.authAdminApi, http(apiCanary.webhooks.edit));
    router.del('/webhooks/:id', mw.authAdminApi, http(apiCanary.webhooks.destroy));

    // ## Oembed (fetch response from oembed provider)
    router.get('/oembed', mw.authAdminApi, http(apiCanary.oembed.read));

    // ## Actions
    router.get('/actions', mw.authAdminApi, http(apiCanary.actions.browse));

    // ## Email Preview
    router.get('/email_preview/posts/:id', mw.authAdminApi, http(apiCanary.email_preview.read));
    router.post('/email_preview/posts/:id', mw.authAdminApi, http(apiCanary.email_preview.sendTestEmail));

    // ## Emails
    router.get('/emails/:id', mw.authAdminApi, http(apiCanary.emails.read));
    router.put('/emails/:id/retry', mw.authAdminApi, http(apiCanary.emails.retry));

    return router;
};
