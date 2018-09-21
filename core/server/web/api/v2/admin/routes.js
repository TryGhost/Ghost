const express = require('express');
// This essentially provides the controllers for the routes
const api = require('../../../../api');

// API specific
const auth = require('../../../../services/auth');
const cors = require('../../../shared/middlewares/api/cors');
const brute = require('../../../shared/middlewares/brute');

// Handling uploads & imports
const tmpdir = require('os').tmpdir;
const upload = require('multer')({dest: tmpdir()});
const validation = require('../../../shared/middlewares/validation');
const image = require('../../../shared/middlewares/image');

const prettyURLs = require('../../../shared/middlewares/pretty-urls');
const {adminRedirect} = require('../../../shared/middlewares/url-redirects');

// Temporary
// @TODO find a more appy way to do this!
const labs = require('../../../shared/middlewares/labs');

/**
 * Authentication for private endpoints
 */
const authenticatePrivate = [
    auth.authenticate.authenticateClient,
    auth.authenticate.authenticateUser,
    auth.authorize.requiresAuthorizedUser,
    cors,
    adminRedirect,
    prettyURLs
];

/**
 * Authentication for client endpoints
 */
let authenticateClient = function authenticateClient(client) {
    return [
        auth.authenticate.authenticateClient,
        auth.authenticate.authenticateUser,
        auth.authorize.requiresAuthorizedClient(client),
        cors,
        adminRedirect,
        prettyURLs
    ];
};

module.exports = function apiRoutes() {
    const router = express.Router();

    // alias delete with del
    router.del = router.delete;

    // ## CORS pre-flight check
    router.options('*', cors);

    // ## Configuration
    router.get('/configuration', api.http(api.configuration.read));
    router.get('/configuration/:key', authenticatePrivate, api.http(api.configuration.read));

    // ## Posts
    router.get('/posts', authenticatePrivate, api.http(api.posts.browse));

    router.post('/posts', authenticatePrivate, api.http(api.posts.add));
    router.get('/posts/:id', authenticatePrivate, api.http(api.posts.read));
    router.get('/posts/slug/:slug', authenticatePrivate, api.http(api.posts.read));
    router.put('/posts/:id', authenticatePrivate, api.http(api.posts.edit));
    router.del('/posts/:id', authenticatePrivate, api.http(api.posts.destroy));

    // ## Schedules
    router.put('/schedules/posts/:id', [
        auth.authenticate.authenticateClient,
        auth.authenticate.authenticateUser
    ], api.http(api.schedules.publishPost));

    // ## Settings
    router.get('/settings/routes/yaml', authenticatePrivate, api.http(api.settings.download));
    router.post('/settings/routes/yaml',
        authenticatePrivate,
        upload.single('routes'),
        validation.upload({type: 'routes'}),
        api.http(api.settings.upload)
    );

    router.get('/settings', authenticatePrivate, api.http(api.settings.browse));
    router.get('/settings/:key', authenticatePrivate, api.http(api.settings.read));
    router.put('/settings', authenticatePrivate, api.http(api.settings.edit));

    // ## Users
    router.get('/users', authenticatePrivate, api.http(api.users.browse));
    router.get('/users/:id', authenticatePrivate, api.http(api.users.read));
    router.get('/users/slug/:slug', authenticatePrivate, api.http(api.users.read));
    // NOTE: We don't expose any email addresses via the public api.
    router.get('/users/email/:email', authenticatePrivate, api.http(api.users.read));

    router.put('/users/password', authenticatePrivate, api.http(api.users.changePassword));
    router.put('/users/owner', authenticatePrivate, api.http(api.users.transferOwnership));
    router.put('/users/:id', authenticatePrivate, api.http(api.users.edit));
    router.del('/users/:id', authenticatePrivate, api.http(api.users.destroy));

    // ## Tags
    router.get('/tags', authenticatePrivate, api.http(api.tags.browse));
    router.get('/tags/:id', authenticatePrivate, api.http(api.tags.read));
    router.get('/tags/slug/:slug', authenticatePrivate, api.http(api.tags.read));
    router.post('/tags', authenticatePrivate, api.http(api.tags.add));
    router.put('/tags/:id', authenticatePrivate, api.http(api.tags.edit));
    router.del('/tags/:id', authenticatePrivate, api.http(api.tags.destroy));

    // ## Subscribers
    router.get('/subscribers', labs.subscribers, authenticatePrivate, api.http(api.subscribers.browse));
    router.get('/subscribers/csv', labs.subscribers, authenticatePrivate, api.http(api.subscribers.exportCSV));
    router.post('/subscribers/csv',
        labs.subscribers,
        authenticatePrivate,
        upload.single('subscribersfile'),
        validation.upload({type: 'subscribers'}),
        api.http(api.subscribers.importCSV)
    );
    router.get('/subscribers/:id', labs.subscribers, authenticatePrivate, api.http(api.subscribers.read));
    router.get('/subscribers/email/:email', labs.subscribers, authenticatePrivate, api.http(api.subscribers.read));
    router.post('/subscribers', labs.subscribers, authenticatePrivate, api.http(api.subscribers.add));
    router.put('/subscribers/:id', labs.subscribers, authenticatePrivate, api.http(api.subscribers.edit));
    router.del('/subscribers/:id', labs.subscribers, authenticatePrivate, api.http(api.subscribers.destroy));
    router.del('/subscribers/email/:email', labs.subscribers, authenticatePrivate, api.http(api.subscribers.destroy));

    // ## Roles
    router.get('/roles/', authenticatePrivate, api.http(api.roles.browse));

    // ## Clients
    router.get('/clients/slug/:slug', api.http(api.clients.read));

    // ## Slugs
    router.get('/slugs/:type/:name', authenticatePrivate, api.http(api.slugs.generate));

    // ## Themes
    router.get('/themes/', authenticatePrivate, api.http(api.themes.browse));

    router.get('/themes/:name/download',
        authenticatePrivate,
        api.http(api.themes.download)
    );

    router.post('/themes/upload',
        authenticatePrivate,
        upload.single('theme'),
        validation.upload({type: 'themes'}),
        api.http(api.themes.upload)
    );

    router.put('/themes/:name/activate',
        authenticatePrivate,
        api.http(api.themes.activate)
    );

    router.del('/themes/:name',
        authenticatePrivate,
        api.http(api.themes.destroy)
    );

    // ## Notifications
    router.get('/notifications', authenticatePrivate, api.http(api.notifications.browse));
    router.post('/notifications', authenticatePrivate, api.http(api.notifications.add));
    router.del('/notifications/:id', authenticatePrivate, api.http(api.notifications.destroy));

    // ## DB
    router.get('/db', authenticatePrivate, api.http(api.db.exportContent));
    router.post('/db',
        authenticatePrivate,
        upload.single('importfile'),
        validation.upload({type: 'db'}),
        api.http(api.db.importContent)
    );
    router.del('/db', authenticatePrivate, api.http(api.db.deleteAllContent));

    // ## Mail
    router.post('/mail', authenticatePrivate, api.http(api.mail.send));
    router.post('/mail/test', authenticatePrivate, api.http(api.mail.sendTest));

    // ## Slack
    router.post('/slack/test', authenticatePrivate, api.http(api.slack.sendTest));

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
    router.put('/authentication/setup', authenticatePrivate, api.http(api.authentication.updateSetup));
    router.get('/authentication/setup', api.http(api.authentication.isSetup));

    router.post('/authentication/token',
        authenticateClient(),
        brute.globalBlock,
        brute.userLogin,
        auth.oauth.generateAccessToken
    );

    router.post('/authentication/revoke', authenticatePrivate, api.http(api.authentication.revoke));

    // ## Uploads
    // @TODO: rename endpoint to /images/upload (or similar)
    router.post('/uploads',
        authenticatePrivate,
        upload.single('uploadimage'),
        validation.upload({type: 'images'}),
        image.normalize,
        api.http(api.uploads.add)
    );

    router.post('/db/backup', authenticateClient('Ghost Backup'), api.http(api.db.backupContent));

    router.post('/uploads/icon',
        authenticatePrivate,
        upload.single('uploadimage'),
        validation.upload({type: 'icons'}),
        validation.blogIcon(),
        api.http(api.uploads.add)
    );

    // ## Invites
    router.get('/invites', authenticatePrivate, api.http(api.invites.browse));
    router.get('/invites/:id', authenticatePrivate, api.http(api.invites.read));
    router.post('/invites', authenticatePrivate, api.http(api.invites.add));
    router.del('/invites/:id', authenticatePrivate, api.http(api.invites.destroy));

    // ## Redirects (JSON based)
    router.get('/redirects/json', authenticatePrivate, api.http(api.redirects.download));
    router.post('/redirects/json',
        authenticatePrivate,
        upload.single('redirects'),
        validation.upload({type: 'redirects'}),
        api.http(api.redirects.upload)
    );

    // ## Webhooks (RESTHooks)
    router.post('/webhooks', authenticatePrivate, api.http(api.webhooks.add));
    router.del('/webhooks/:id', authenticatePrivate, api.http(api.webhooks.destroy));

    // ## Oembed (fetch response from oembed provider)
    router.get('/oembed', authenticatePrivate, api.http(api.oembed.read));

    return router;
};
