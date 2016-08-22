// # API routes
var express     = require('express'),
    api         = require('../api'),
    apiRoutes;

apiRoutes = function apiRoutes(middleware) {
    var router = express.Router(),
        // Authentication for public endpoints
        authenticatePublic = [
            middleware.api.authenticateClient,
            middleware.api.authenticateUser,
            middleware.api.requiresAuthorizedUserPublicAPI,
            middleware.api.cors
        ],
        // Require user for private endpoints
        authenticatePrivate = [
            middleware.api.authenticateClient,
            middleware.api.authenticateUser,
            middleware.api.requiresAuthorizedUser,
            middleware.api.cors
        ];

    // alias delete with del
    router.del = router.delete;

    // send 503 json response in case of maintenance
    router.use(middleware.api.maintenance);

    // Check version matches for API requests, depends on res.locals.safeVersion being set
    // Therefore must come after themeHandler.ghostLocals, for now
    router.use(middleware.api.versionMatch);

    // ## CORS pre-flight check
    router.options('*', middleware.api.cors);

    // ## Configuration
    router.get('/configuration', authenticatePrivate, api.http(api.configuration.read));
    router.get('/configuration/:key', authenticatePrivate, api.http(api.configuration.read));
    router.get('/configuration/timezones', authenticatePrivate, api.http(api.configuration.read));

    // ## Posts
    router.get('/posts', authenticatePublic, api.http(api.posts.browse));

    router.post('/posts', authenticatePrivate, api.http(api.posts.add));
    router.get('/posts/:id', authenticatePublic, api.http(api.posts.read));
    router.get('/posts/slug/:slug', authenticatePublic, api.http(api.posts.read));
    router.put('/posts/:id', authenticatePrivate, api.http(api.posts.edit));
    router.del('/posts/:id', authenticatePrivate, api.http(api.posts.destroy));

    // ## Schedules
    router.put('/schedules/posts/:id', [middleware.api.authenticateClient, middleware.api.authenticateUser], api.http(api.schedules.publishPost));

    // ## Settings
    router.get('/settings', authenticatePrivate, api.http(api.settings.browse));
    router.get('/settings/:key', authenticatePrivate, api.http(api.settings.read));
    router.put('/settings', authenticatePrivate, api.http(api.settings.edit));

    // ## Users
    router.get('/users', authenticatePublic, api.http(api.users.browse));

    router.get('/users/:id', authenticatePublic, api.http(api.users.read));
    router.get('/users/slug/:slug', authenticatePublic, api.http(api.users.read));
    router.get('/users/email/:email', authenticatePublic, api.http(api.users.read));
    router.put('/users/password', authenticatePrivate, api.http(api.users.changePassword));
    router.put('/users/owner', authenticatePrivate, api.http(api.users.transferOwnership));
    router.put('/users/:id', authenticatePrivate, api.http(api.users.edit));
    router.post('/users', authenticatePrivate, api.http(api.users.add));
    router.del('/users/:id', authenticatePrivate, api.http(api.users.destroy));

    // ## Tags
    router.get('/tags', authenticatePublic, api.http(api.tags.browse));
    router.get('/tags/:id', authenticatePublic, api.http(api.tags.read));
    router.get('/tags/slug/:slug', authenticatePublic, api.http(api.tags.read));
    router.post('/tags', authenticatePrivate, api.http(api.tags.add));
    router.put('/tags/:id', authenticatePrivate, api.http(api.tags.edit));
    router.del('/tags/:id', authenticatePrivate, api.http(api.tags.destroy));

    // ## Subscribers
    router.get('/subscribers', middleware.api.labs.subscribers, authenticatePrivate, api.http(api.subscribers.browse));
    router.get('/subscribers/csv', middleware.api.labs.subscribers, authenticatePrivate, api.http(api.subscribers.exportCSV));
    router.post('/subscribers/csv',
        middleware.api.labs.subscribers,
        authenticatePrivate,
        middleware.upload.single('subscribersfile'),
        middleware.validation.upload({type: 'subscribers'}),
        api.http(api.subscribers.importCSV)
    );
    router.get('/subscribers/:id', middleware.api.labs.subscribers, authenticatePrivate, api.http(api.subscribers.read));
    router.post('/subscribers', middleware.api.labs.subscribers, authenticatePublic, api.http(api.subscribers.add));
    router.put('/subscribers/:id', middleware.api.labs.subscribers, authenticatePrivate, api.http(api.subscribers.edit));
    router.del('/subscribers/:id',  middleware.api.labs.subscribers, authenticatePrivate, api.http(api.subscribers.destroy));

    // ## Roles
    router.get('/roles/', authenticatePrivate, api.http(api.roles.browse));

    // ## Clients
    router.get('/clients/slug/:slug', api.http(api.clients.read));

    // ## Slugs
    router.get('/slugs/:type/:name', authenticatePrivate, api.http(api.slugs.generate));

    // ## Themes
    router.get('/themes/:name/download',
        authenticatePrivate,
        api.http(api.themes.download)
    );

    router.post('/themes/upload',
        authenticatePrivate,
        middleware.upload.single('theme'),
        middleware.validation.upload({type: 'themes'}),
        api.http(api.themes.upload)
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
        middleware.upload.single('importfile'),
        middleware.validation.upload({type: 'db'}),
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
        middleware.spamPrevention.forgotten,
        api.http(api.authentication.generateResetToken)
    );
    router.put('/authentication/passwordreset', api.http(api.authentication.resetPassword));
    router.post('/authentication/invitation', api.http(api.authentication.acceptInvitation));
    router.get('/authentication/invitation', api.http(api.authentication.isInvitation));
    router.post('/authentication/setup', api.http(api.authentication.setup));
    router.put('/authentication/setup', authenticatePrivate, api.http(api.authentication.updateSetup));
    router.get('/authentication/setup', api.http(api.authentication.isSetup));
    router.post('/authentication/token',
        middleware.spamPrevention.signin,
        middleware.api.authenticateClient,
        middleware.oauth.generateAccessToken
    );
    router.post('/authentication/revoke', authenticatePrivate, api.http(api.authentication.revoke));

    // ## Uploads
    // @TODO: rename endpoint to /images/upload (or similar)
    router.post('/uploads',
        authenticatePrivate,
        middleware.upload.single('uploadimage'),
        middleware.validation.upload({type: 'images'}),
        api.http(api.uploads.add)
    );

    // API Router middleware
    router.use(middleware.api.errorHandler);

    return router;
};

module.exports = apiRoutes;
