var express = require('express'),
    // This essentially provides the controllers for the routes
    api = require('../api'),

    // Middleware
    prettyURLs = require('../middleware/pretty-urls'),

    // API specific
    auth = require('../auth'),
    cors = require('../middleware/api/cors'),
    brute = require('../middleware/brute'),

    // Handling uploads & imports
    tmpdir = require('os').tmpdir,
    upload = require('multer')({dest: tmpdir()}),
    validation = require('../middleware/validation'),

    // Temporary
    // @TODO find a more appy way to do this!
    labs = require('../middleware/labs'),

    /**
     * Authentication for public endpoints
     * @TODO find a better way to bundle these authentication packages
     *
     * IMPORTANT
     * - cors middleware MUST happen before pretty urls, because otherwise cors header can get lost
     * - cors middleware MUST happen after authenticateClient, because authenticateClient reads the trusted domains
     */
    authenticatePublic = [
        auth.authenticate.authenticateClient,
        auth.authenticate.authenticateUser,
        auth.authorize.requiresAuthorizedUserPublicAPI,
        cors,
        prettyURLs
    ],
    // Require user for private endpoints
    authenticatePrivate = [
        auth.authenticate.authenticateClient,
        auth.authenticate.authenticateUser,
        auth.authorize.requiresAuthorizedUser,
        cors,
        prettyURLs
    ];

// @TODO refactor/clean this up - how do we want the routing to work long term?
module.exports = function apiRoutes() {
    var apiRouter = express.Router();

    // alias delete with del
    apiRouter.del = apiRouter.delete;

    // ## CORS pre-flight check
    apiRouter.options('*', cors);

    // ## Configuration
    apiRouter.get('/configuration', api.http(api.configuration.read));
    apiRouter.get('/configuration/:key', authenticatePrivate, api.http(api.configuration.read));

    // ## Posts
    apiRouter.get('/posts', authenticatePublic, api.http(api.posts.browse));

    apiRouter.post('/posts', authenticatePrivate, api.http(api.posts.add));
    apiRouter.get('/posts/:id', authenticatePublic, api.http(api.posts.read));
    apiRouter.get('/posts/slug/:slug', authenticatePublic, api.http(api.posts.read));
    apiRouter.put('/posts/:id', authenticatePrivate, api.http(api.posts.edit));
    apiRouter.del('/posts/:id', authenticatePrivate, api.http(api.posts.destroy));

    // ## Schedules
    apiRouter.put('/schedules/posts/:id', [
        auth.authenticate.authenticateClient,
        auth.authenticate.authenticateUser
    ], api.http(api.schedules.publishPost));

    // ## Settings
    apiRouter.get('/settings', authenticatePrivate, api.http(api.settings.browse));
    apiRouter.get('/settings/:key', authenticatePrivate, api.http(api.settings.read));
    apiRouter.put('/settings', authenticatePrivate, api.http(api.settings.edit));

    // ## Users
    apiRouter.get('/users', authenticatePublic, api.http(api.users.browse));
    apiRouter.get('/users/:id', authenticatePublic, api.http(api.users.read));
    apiRouter.get('/users/slug/:slug', authenticatePublic, api.http(api.users.read));
    apiRouter.get('/users/email/:email', authenticatePublic, api.http(api.users.read));

    apiRouter.put('/users/password', authenticatePrivate, api.http(api.users.changePassword));
    apiRouter.put('/users/owner', authenticatePrivate, api.http(api.users.transferOwnership));
    apiRouter.put('/users/:id', authenticatePrivate, api.http(api.users.edit));

    apiRouter.post('/users', authenticatePrivate, api.http(api.users.add));
    apiRouter.del('/users/:id', authenticatePrivate, api.http(api.users.destroy));

    // ## Tags
    apiRouter.get('/tags', authenticatePublic, api.http(api.tags.browse));
    apiRouter.get('/tags/:id', authenticatePublic, api.http(api.tags.read));
    apiRouter.get('/tags/slug/:slug', authenticatePublic, api.http(api.tags.read));
    apiRouter.post('/tags', authenticatePrivate, api.http(api.tags.add));
    apiRouter.put('/tags/:id', authenticatePrivate, api.http(api.tags.edit));
    apiRouter.del('/tags/:id', authenticatePrivate, api.http(api.tags.destroy));

    // ## Subscribers
    apiRouter.get('/subscribers', labs.subscribers, authenticatePrivate, api.http(api.subscribers.browse));
    apiRouter.get('/subscribers/csv', labs.subscribers, authenticatePrivate, api.http(api.subscribers.exportCSV));
    apiRouter.post('/subscribers/csv',
        labs.subscribers,
        authenticatePrivate,
        upload.single('subscribersfile'),
        validation.upload({type: 'subscribers'}),
        api.http(api.subscribers.importCSV)
    );
    apiRouter.get('/subscribers/:id', labs.subscribers, authenticatePrivate, api.http(api.subscribers.read));
    apiRouter.post('/subscribers', labs.subscribers, authenticatePublic, api.http(api.subscribers.add));
    apiRouter.put('/subscribers/:id', labs.subscribers, authenticatePrivate, api.http(api.subscribers.edit));
    apiRouter.del('/subscribers/:id', labs.subscribers, authenticatePrivate, api.http(api.subscribers.destroy));

    // ## Roles
    apiRouter.get('/roles/', authenticatePrivate, api.http(api.roles.browse));

    // ## Clients
    apiRouter.get('/clients/slug/:slug', api.http(api.clients.read));

    // ## Slugs
    apiRouter.get('/slugs/:type/:name', authenticatePrivate, api.http(api.slugs.generate));

    // ## Themes
    apiRouter.get('/themes/', authenticatePrivate, api.http(api.themes.browse));

    apiRouter.get('/themes/:name/download',
        authenticatePrivate,
        api.http(api.themes.download)
    );

    apiRouter.post('/themes/upload',
        authenticatePrivate,
        upload.single('theme'),
        validation.upload({type: 'themes'}),
        api.http(api.themes.upload)
    );

    apiRouter.put('/themes/:name/activate',
        authenticatePrivate,
        api.http(api.themes.activate)
    );

    apiRouter.del('/themes/:name',
        authenticatePrivate,
        api.http(api.themes.destroy)
    );

    // ## Notifications
    apiRouter.get('/notifications', authenticatePrivate, api.http(api.notifications.browse));
    apiRouter.post('/notifications', authenticatePrivate, api.http(api.notifications.add));
    apiRouter.del('/notifications/:id', authenticatePrivate, api.http(api.notifications.destroy));

    // ## DB
    apiRouter.get('/db', authenticatePrivate, api.http(api.db.exportContent));
    apiRouter.post('/db',
        authenticatePrivate,
        upload.single('importfile'),
        validation.upload({type: 'db'}),
        api.http(api.db.importContent)
    );
    apiRouter.del('/db', authenticatePrivate, api.http(api.db.deleteAllContent));

    // ## Mail
    apiRouter.post('/mail', authenticatePrivate, api.http(api.mail.send));
    apiRouter.post('/mail/test', authenticatePrivate, api.http(api.mail.sendTest));

    // ## Slack
    apiRouter.post('/slack/test', authenticatePrivate, api.http(api.slack.sendTest));

    // ## Authentication
    apiRouter.post('/authentication/passwordreset',
        brute.globalReset,
        brute.userReset,
        api.http(api.authentication.generateResetToken)
    );
    apiRouter.put('/authentication/passwordreset', brute.globalBlock, api.http(api.authentication.resetPassword));
    apiRouter.post('/authentication/invitation', api.http(api.authentication.acceptInvitation));
    apiRouter.get('/authentication/invitation', api.http(api.authentication.isInvitation));
    apiRouter.post('/authentication/setup', api.http(api.authentication.setup));
    apiRouter.put('/authentication/setup', authenticatePrivate, api.http(api.authentication.updateSetup));
    apiRouter.get('/authentication/setup', api.http(api.authentication.isSetup));
    apiRouter.post('/authentication/token',
        brute.globalBlock,
        brute.userLogin,
        auth.authenticate.authenticateClient,
        auth.oauth.generateAccessToken
    );

    apiRouter.post('/authentication/revoke', authenticatePrivate, api.http(api.authentication.revoke));

    // ## Uploads
    // @TODO: rename endpoint to /images/upload (or similar)
    apiRouter.post('/uploads',
        authenticatePrivate,
        upload.single('uploadimage'),
        validation.upload({type: 'images'}),
        api.http(api.uploads.add)
    );

    apiRouter.post('/uploads/icon',
        authenticatePrivate,
        upload.single('uploadimage'),
        validation.upload({type: 'icons'}),
        validation.blogIcon(),
        api.http(api.uploads.add)
    );

    // ## Invites
    apiRouter.get('/invites', authenticatePrivate, api.http(api.invites.browse));
    apiRouter.get('/invites/:id', authenticatePrivate, api.http(api.invites.read));
    apiRouter.post('/invites', authenticatePrivate, api.http(api.invites.add));
    apiRouter.del('/invites/:id', authenticatePrivate, api.http(api.invites.destroy));

    return apiRouter;
};
