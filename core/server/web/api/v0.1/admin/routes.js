const express = require('express'),
    // This essentially provides the controllers for the routes
    api = require('../../../../api'),

    // Middleware
    mw = require('../../middleware'),

    // API specific
    auth = require('../../../../services/auth'),
    cors = require('../../../middleware/api/cors'),
    brute = require('../../../middleware/brute'),

    // Handling uploads & imports
    tmpdir = require('os').tmpdir,
    upload = require('multer')({dest: tmpdir()}),
    validation = require('../../../middleware/validation'),
    image = require('../../../middleware/image'),

    // Temporary
    // @TODO find a more appy way to do this!
    labs = require('../../../middleware/labs');

// @TODO refactor/clean this up - how do we want the routing to work long term?
module.exports = function apiRoutes() {
    const router = express.Router();

    // alias delete with del
    router.del = router.delete;

    // ## CORS pre-flight check
    router.options('*', cors);

    // ## Configuration
    router.get('/configuration', api.http(api.configuration.read));
    router.get('/configuration/:key', mw.authenticatePrivate, api.http(api.configuration.read));

    // ## Posts
    router.post('/posts', mw.authenticatePrivate, api.http(api.posts.add));
    router.put('/posts/:id', mw.authenticatePrivate, api.http(api.posts.edit));
    router.del('/posts/:id', mw.authenticatePrivate, api.http(api.posts.destroy));

    // ## Schedules
    router.put('/schedules/posts/:id', [
        auth.authenticate.authenticateClient,
        auth.authenticate.authenticateUser
    ], api.http(api.schedules.publishPost));

    // ## Settings
    router.get('/settings/routes/yaml', mw.authenticatePrivate, api.http(api.settings.download));
    router.post('/settings/routes/yaml',
        mw.authenticatePrivate,
        upload.single('routes'),
        validation.upload({type: 'routes'}),
        api.http(api.settings.upload)
    );

    router.get('/settings', mw.authenticatePrivate, api.http(api.settings.browse));
    router.get('/settings/:key', mw.authenticatePrivate, api.http(api.settings.read));
    router.put('/settings', mw.authenticatePrivate, api.http(api.settings.edit));

    // ## Users
    router.get('/users/email/:email', mw.authenticatePrivate, api.http(api.users.read));

    router.put('/users/password', mw.authenticatePrivate, api.http(api.users.changePassword));
    router.put('/users/owner', mw.authenticatePrivate, api.http(api.users.transferOwnership));
    router.put('/users/:id', mw.authenticatePrivate, api.http(api.users.edit));
    router.del('/users/:id', mw.authenticatePrivate, api.http(api.users.destroy));

    // ## Tags
    router.post('/tags', mw.authenticatePrivate, api.http(api.tags.add));
    router.put('/tags/:id', mw.authenticatePrivate, api.http(api.tags.edit));
    router.del('/tags/:id', mw.authenticatePrivate, api.http(api.tags.destroy));

    // ## Subscribers
    router.get('/subscribers', labs.subscribers, mw.authenticatePrivate, api.http(api.subscribers.browse));
    router.get('/subscribers/csv', labs.subscribers, mw.authenticatePrivate, api.http(api.subscribers.exportCSV));
    router.post('/subscribers/csv',
        labs.subscribers,
        mw.authenticatePrivate,
        upload.single('subscribersfile'),
        validation.upload({type: 'subscribers'}),
        api.http(api.subscribers.importCSV)
    );
    router.get('/subscribers/:id', labs.subscribers, mw.authenticatePrivate, api.http(api.subscribers.read));
    router.get('/subscribers/email/:email', labs.subscribers, mw.authenticatePrivate, api.http(api.subscribers.read));
    router.put('/subscribers/:id', labs.subscribers, mw.authenticatePrivate, api.http(api.subscribers.edit));
    router.del('/subscribers/:id', labs.subscribers, mw.authenticatePrivate, api.http(api.subscribers.destroy));
    router.del('/subscribers/email/:email', labs.subscribers, mw.authenticatePrivate, api.http(api.subscribers.destroy));

    // ## Roles
    router.get('/roles/', mw.authenticatePrivate, api.http(api.roles.browse));

    // ## Clients
    router.get('/clients/slug/:slug', api.http(api.clients.read));

    // ## Slugs
    router.get('/slugs/:type/:name', mw.authenticatePrivate, api.http(api.slugs.generate));

    // ## Themes
    router.get('/themes/', mw.authenticatePrivate, api.http(api.themes.browse));

    router.get('/themes/:name/download',
        mw.authenticatePrivate,
        api.http(api.themes.download)
    );

    router.post('/themes/upload',
        mw.authenticatePrivate,
        upload.single('theme'),
        validation.upload({type: 'themes'}),
        api.http(api.themes.upload)
    );

    router.put('/themes/:name/activate',
        mw.authenticatePrivate,
        api.http(api.themes.activate)
    );

    router.del('/themes/:name',
        mw.authenticatePrivate,
        api.http(api.themes.destroy)
    );

    // ## Notifications
    router.get('/notifications', mw.authenticatePrivate, api.http(api.notifications.browse));
    router.post('/notifications', mw.authenticatePrivate, api.http(api.notifications.add));
    router.del('/notifications/:id', mw.authenticatePrivate, api.http(api.notifications.destroy));

    // ## DB
    router.get('/db', mw.authenticatePrivate, api.http(api.db.exportContent));
    router.post('/db',
        mw.authenticatePrivate,
        upload.single('importfile'),
        validation.upload({type: 'db'}),
        api.http(api.db.importContent)
    );
    router.del('/db', mw.authenticatePrivate, api.http(api.db.deleteAllContent));

    // ## Mail
    router.post('/mail', mw.authenticatePrivate, api.http(api.mail.send));
    router.post('/mail/test', mw.authenticatePrivate, api.http(api.mail.sendTest));

    // ## Slack
    router.post('/slack/test', mw.authenticatePrivate, api.http(api.slack.sendTest));

    // ## Authentication
    router.post('/authentication/passwordreset',
        brute.globalReset,
        brute.userReset,
        api.http(api.authentication.generateResetToken)
    );
    router.put('/authentication/passwordreset', brute.globalBlock, api.http(api.authentication.resetPassword));
    router.post('/authentication/invitation', api.http(api.authentication.acceptInvitation));
    router.get('/authentication/invitation', api.http(api.authentication.isInvitation));
    router.post('/authentication/setup', api.http(api.authentication.setup));
    router.put('/authentication/setup', mw.authenticatePrivate, api.http(api.authentication.updateSetup));
    router.get('/authentication/setup', api.http(api.authentication.isSetup));

    router.post('/authentication/token',
        mw.authenticateClient(),
        brute.globalBlock,
        brute.userLogin,
        auth.oauth.generateAccessToken
    );

    router.post('/authentication/revoke', mw.authenticatePrivate, api.http(api.authentication.revoke));

    // ## Uploads
    // @TODO: rename endpoint to /images/upload (or similar)
    router.post('/uploads',
        mw.authenticatePrivate,
        upload.single('uploadimage'),
        validation.upload({type: 'images'}),
        image.normalize,
        api.http(api.uploads.add)
    );

    router.post('/db/backup', mw.authenticateClient('Ghost Backup'), api.http(api.db.backupContent));

    router.post('/uploads/icon',
        mw.authenticatePrivate,
        upload.single('uploadimage'),
        validation.upload({type: 'icons'}),
        validation.blogIcon(),
        api.http(api.uploads.add)
    );

    // ## Invites
    router.get('/invites', mw.authenticatePrivate, api.http(api.invites.browse));
    router.get('/invites/:id', mw.authenticatePrivate, api.http(api.invites.read));
    router.post('/invites', mw.authenticatePrivate, api.http(api.invites.add));
    router.del('/invites/:id', mw.authenticatePrivate, api.http(api.invites.destroy));

    // ## Redirects (JSON based)
    router.get('/redirects/json', mw.authenticatePrivate, api.http(api.redirects.download));
    router.post('/redirects/json',
        mw.authenticatePrivate,
        upload.single('redirects'),
        validation.upload({type: 'redirects'}),
        api.http(api.redirects.upload)
    );

    // ## Webhooks (RESTHooks)
    router.post('/webhooks', mw.authenticatePrivate, api.http(api.webhooks.add));
    router.del('/webhooks/:id', mw.authenticatePrivate, api.http(api.webhooks.destroy));

    // ## Oembed (fetch response from oembed provider)
    router.get('/oembed', mw.authenticatePrivate, api.http(api.oembed.read));

    return router;
};
