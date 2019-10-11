const express = require('express');
const apiv2 = require('../../../../api/v2');
const mw = require('./middleware');

const shared = require('../../../shared');

// Handling uploads & imports
const upload = shared.middlewares.upload;

module.exports = function apiRoutes() {
    const router = express.Router();

    // alias delete with del
    router.del = router.delete;

    router.use(shared.middlewares.api.cors);

    const http = apiv2.http;

    // ## Public
    router.get('/site', mw.publicAdminApi, http(apiv2.site.read));

    // ## Configuration
    router.get('/config', mw.authAdminApi, http(apiv2.config.read));

    // ## Posts
    router.get('/posts', mw.authAdminApi, http(apiv2.posts.browse));
    router.post('/posts', mw.authAdminApi, http(apiv2.posts.add));
    router.get('/posts/:id', mw.authAdminApi, http(apiv2.posts.read));
    router.get('/posts/slug/:slug', mw.authAdminApi, http(apiv2.posts.read));
    router.put('/posts/:id', mw.authAdminApi, http(apiv2.posts.edit));
    router.del('/posts/:id', mw.authAdminApi, http(apiv2.posts.destroy));

    // ## Pages
    router.get('/pages', mw.authAdminApi, http(apiv2.pages.browse));
    router.post('/pages', mw.authAdminApi, http(apiv2.pages.add));
    router.get('/pages/:id', mw.authAdminApi, http(apiv2.pages.read));
    router.get('/pages/slug/:slug', mw.authAdminApi, http(apiv2.pages.read));
    router.put('/pages/:id', mw.authAdminApi, http(apiv2.pages.edit));
    router.del('/pages/:id', mw.authAdminApi, http(apiv2.pages.destroy));

    // # Integrations

    router.get('/integrations', mw.authAdminApi, http(apiv2.integrations.browse));
    router.get('/integrations/:id', mw.authAdminApi, http(apiv2.integrations.read));
    router.post('/integrations', mw.authAdminApi, http(apiv2.integrations.add));
    router.put('/integrations/:id', mw.authAdminApi, http(apiv2.integrations.edit));
    router.del('/integrations/:id', mw.authAdminApi, http(apiv2.integrations.destroy));

    // ## Schedules
    router.put('/schedules/:resource/:id', mw.authAdminApiWithUrl, http(apiv2.schedules.publish));

    // ## Settings
    router.get('/settings/routes/yaml', mw.authAdminApi, http(apiv2.settings.download));
    router.post('/settings/routes/yaml',
        mw.authAdminApi,
        upload.single('routes'),
        shared.middlewares.validation.upload({type: 'routes'}),
        http(apiv2.settings.upload)
    );

    router.get('/settings', mw.authAdminApi, http(apiv2.settings.browse));
    router.get('/settings/:key', mw.authAdminApi, http(apiv2.settings.read));
    router.put('/settings', mw.authAdminApi, http(apiv2.settings.edit));

    // ## Users
    router.get('/users', mw.authAdminApi, http(apiv2.users.browse));
    router.get('/users/:id', mw.authAdminApi, http(apiv2.users.read));
    router.get('/users/slug/:slug', mw.authAdminApi, http(apiv2.users.read));
    // NOTE: We don't expose any email addresses via the public api.
    router.get('/users/email/:email', mw.authAdminApi, http(apiv2.users.read));

    router.put('/users/password', mw.authAdminApi, http(apiv2.users.changePassword));
    router.put('/users/owner', mw.authAdminApi, http(apiv2.users.transferOwnership));
    router.put('/users/:id', mw.authAdminApi, http(apiv2.users.edit));
    router.del('/users/:id', mw.authAdminApi, http(apiv2.users.destroy));

    // ## Tags
    router.get('/tags', mw.authAdminApi, http(apiv2.tags.browse));
    router.get('/tags/:id', mw.authAdminApi, http(apiv2.tags.read));
    router.get('/tags/slug/:slug', mw.authAdminApi, http(apiv2.tags.read));
    router.post('/tags', mw.authAdminApi, http(apiv2.tags.add));
    router.put('/tags/:id', mw.authAdminApi, http(apiv2.tags.edit));
    router.del('/tags/:id', mw.authAdminApi, http(apiv2.tags.destroy));

    // ## Roles
    router.get('/roles/', mw.authAdminApi, http(apiv2.roles.browse));

    // ## Slugs
    router.get('/slugs/:type/:name', mw.authAdminApi, http(apiv2.slugs.generate));

    // ## Themes
    router.get('/themes/', mw.authAdminApi, http(apiv2.themes.browse));

    router.get('/themes/:name/download',
        mw.authAdminApi,
        http(apiv2.themes.download)
    );

    router.post('/themes/upload',
        mw.authAdminApi,
        upload.single('file'),
        shared.middlewares.validation.upload({type: 'themes'}),
        http(apiv2.themes.upload)
    );

    router.put('/themes/:name/activate',
        mw.authAdminApi,
        http(apiv2.themes.activate)
    );

    router.del('/themes/:name',
        mw.authAdminApi,
        http(apiv2.themes.destroy)
    );

    // ## Notifications
    router.get('/notifications', mw.authAdminApi, http(apiv2.notifications.browse));
    router.post('/notifications', mw.authAdminApi, http(apiv2.notifications.add));
    router.del('/notifications/:notification_id', mw.authAdminApi, http(apiv2.notifications.destroy));

    // ## DB
    router.get('/db', mw.authAdminApi, http(apiv2.db.exportContent));
    router.post('/db',
        mw.authAdminApi,
        upload.single('importfile'),
        shared.middlewares.validation.upload({type: 'db'}),
        http(apiv2.db.importContent)
    );
    router.del('/db', mw.authAdminApi, http(apiv2.db.deleteAllContent));
    router.post('/db/backup',
        mw.authAdminApi,
        http(apiv2.db.backupContent)
    );

    // ## Mail
    router.post('/mail', mw.authAdminApi, http(apiv2.mail.send));
    router.post('/mail/test', mw.authAdminApi, http(apiv2.mail.sendTest));

    // ## Slack
    router.post('/slack/test', mw.authAdminApi, http(apiv2.slack.sendTest));

    // ## Sessions
    router.get('/session', mw.authAdminApi, http(apiv2.session.read));
    // We don't need auth when creating a new session (logging in)
    router.post('/session',
        shared.middlewares.brute.globalBlock,
        shared.middlewares.brute.userLogin,
        http(apiv2.session.add)
    );
    router.del('/session', mw.authAdminApi, http(apiv2.session.delete));

    // ## Authentication
    router.post('/authentication/passwordreset',
        shared.middlewares.brute.globalReset,
        shared.middlewares.brute.userReset,
        http(apiv2.authentication.generateResetToken)
    );
    router.put('/authentication/passwordreset', shared.middlewares.brute.globalBlock, http(apiv2.authentication.resetPassword));
    router.post('/authentication/invitation', http(apiv2.authentication.acceptInvitation));
    router.get('/authentication/invitation', http(apiv2.authentication.isInvitation));
    router.post('/authentication/setup', http(apiv2.authentication.setup));
    router.put('/authentication/setup', mw.authAdminApi, http(apiv2.authentication.updateSetup));
    router.get('/authentication/setup', http(apiv2.authentication.isSetup));

    // ## Images
    router.post('/images/upload',
        mw.authAdminApi,
        upload.single('file'),
        shared.middlewares.validation.upload({type: 'images'}),
        shared.middlewares.image.normalize,
        http(apiv2.images.upload)
    );

    // ## Invites
    router.get('/invites', mw.authAdminApi, http(apiv2.invites.browse));
    router.get('/invites/:id', mw.authAdminApi, http(apiv2.invites.read));
    router.post('/invites', mw.authAdminApi, http(apiv2.invites.add));
    router.del('/invites/:id', mw.authAdminApi, http(apiv2.invites.destroy));

    // ## Redirects (JSON based)
    router.get('/redirects/json', mw.authAdminApi, http(apiv2.redirects.download));
    router.post('/redirects/json',
        mw.authAdminApi,
        upload.single('redirects'),
        shared.middlewares.validation.upload({type: 'redirects'}),
        http(apiv2.redirects.upload)
    );

    // ## Webhooks (RESTHooks)
    router.post('/webhooks', mw.authAdminApi, http(apiv2.webhooks.add));
    router.put('/webhooks/:id', mw.authAdminApi, http(apiv2.webhooks.edit));
    router.del('/webhooks/:id', mw.authAdminApi, http(apiv2.webhooks.destroy));

    // ## Oembed (fetch response from oembed provider)
    router.get('/oembed', mw.authAdminApi, http(apiv2.oembed.read));

    // ## Actions
    router.get('/actions/:type/:id', mw.authAdminApi, http(apiv2.actions.browse));

    return router;
};
