// # API routes
var express = require('express'),
    api = require('../api'),
    auth = require('../auth'),

    // From middleware/index.js
    bodyParser      = require('body-parser'),
    tmpdir          = require('os').tmpdir,
    // @TODO refactor this again :P
    middleware = {
        upload: require('multer')({dest: tmpdir()}),
        validation: require('../middleware/validation'),
        cacheControl: require('../middleware/cache-control'),
        spamPrevention: require('../middleware/spam-prevention'),
        api: {
            errorHandler: require('../middleware/error-handler'),
            cors: require('../middleware/cors'),
            labs: require('../middleware/labs'),
            versionMatch: require('../middleware/api/version-match'),
            maintenance: require('../middleware/maintenance')
        }
    },
    // Authentication for public endpoints
    authenticatePublic = [
        auth.authenticate.authenticateClient,
        auth.authenticate.authenticateUser,
        auth.authorize.requiresAuthorizedUserPublicAPI,
        middleware.api.cors
    ],
    // Require user for private endpoints
    authenticatePrivate = [
        auth.authenticate.authenticateClient,
        auth.authenticate.authenticateUser,
        auth.authorize.requiresAuthorizedUser,
        middleware.api.cors
    ];

// @TODO refactor/clean this up - how do we want the routing to work long term?
function apiRoutes() {
    var apiRouter = express.Router();

    // alias delete with del
    apiRouter.del = apiRouter.delete;

    // ## Configuration
    apiRouter.get('/configuration', authenticatePrivate, api.http(api.configuration.read));
    apiRouter.get('/configuration/:key', authenticatePrivate, api.http(api.configuration.read));
    apiRouter.get('/configuration/timezones', authenticatePrivate, api.http(api.configuration.read));

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
    apiRouter.get('/subscribers', middleware.api.labs.subscribers, authenticatePrivate, api.http(api.subscribers.browse));
    apiRouter.get('/subscribers/csv', middleware.api.labs.subscribers, authenticatePrivate, api.http(api.subscribers.exportCSV));
    apiRouter.post('/subscribers/csv',
        middleware.api.labs.subscribers,
        authenticatePrivate,
        middleware.upload.single('subscribersfile'),
        middleware.validation.upload({type: 'subscribers'}),
        api.http(api.subscribers.importCSV)
    );
    apiRouter.get('/subscribers/:id', middleware.api.labs.subscribers, authenticatePrivate, api.http(api.subscribers.read));
    apiRouter.post('/subscribers', middleware.api.labs.subscribers, authenticatePublic, api.http(api.subscribers.add));
    apiRouter.put('/subscribers/:id', middleware.api.labs.subscribers, authenticatePrivate, api.http(api.subscribers.edit));
    apiRouter.del('/subscribers/:id', middleware.api.labs.subscribers, authenticatePrivate, api.http(api.subscribers.destroy));

    // ## Roles
    apiRouter.get('/roles/', authenticatePrivate, api.http(api.roles.browse));

    // ## Clients
    apiRouter.get('/clients/slug/:slug', api.http(api.clients.read));

    // ## Slugs
    apiRouter.get('/slugs/:type/:name', authenticatePrivate, api.http(api.slugs.generate));

    // ## Themes
    apiRouter.get('/themes/:name/download',
        authenticatePrivate,
        api.http(api.themes.download)
    );

    apiRouter.post('/themes/upload',
        authenticatePrivate,
        middleware.upload.single('theme'),
        middleware.validation.upload({type: 'themes'}),
        api.http(api.themes.upload)
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
        middleware.upload.single('importfile'),
        middleware.validation.upload({type: 'db'}),
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
        middleware.spamPrevention.forgotten,
        api.http(api.authentication.generateResetToken)
    );
    apiRouter.put('/authentication/passwordreset', api.http(api.authentication.resetPassword));
    apiRouter.post('/authentication/invitation', api.http(api.authentication.acceptInvitation));
    apiRouter.get('/authentication/invitation', api.http(api.authentication.isInvitation));
    apiRouter.post('/authentication/setup', api.http(api.authentication.setup));
    apiRouter.put('/authentication/setup', authenticatePrivate, api.http(api.authentication.updateSetup));
    apiRouter.get('/authentication/setup', api.http(api.authentication.isSetup));
    apiRouter.post('/authentication/token',
        middleware.spamPrevention.signin,
        auth.authenticate.authenticateClient,
        auth.oauth.generateAccessToken
    );

    apiRouter.post('/authentication/ghost', [
        auth.authenticate.authenticateClient,
        auth.authenticate.authenticateGhostUser,
        api.http(api.authentication.createTokens)
    ]);

    apiRouter.post('/authentication/revoke', authenticatePrivate, api.http(api.authentication.revoke));

    // ## Uploads
    // @TODO: rename endpoint to /images/upload (or similar)
    apiRouter.post('/uploads',
        authenticatePrivate,
        middleware.upload.single('uploadimage'),
        middleware.validation.upload({type: 'images'}),
        api.http(api.uploads.add)
    );

    // ## Invites
    apiRouter.get('/invites', authenticatePrivate, api.http(api.invites.browse));
    apiRouter.get('/invites/:id', authenticatePrivate, api.http(api.invites.read));
    apiRouter.post('/invites', authenticatePrivate, api.http(api.invites.add));
    apiRouter.del('/invites/:id', authenticatePrivate, api.http(api.invites.destroy));

    return apiRouter;
}

module.exports = function setupApiApp() {
    var apiApp = express();

    // API middleware

    // Body parsing
    apiApp.use(bodyParser.json({limit: '1mb'}));
    apiApp.use(bodyParser.urlencoded({extended: true, limit: '1mb'}));

    // send 503 json response in case of maintenance
    apiApp.use(middleware.api.maintenance);

    // Check version matches for API requests, depends on res.locals.safeVersion being set
    // Therefore must come after themeHandler.ghostLocals, for now
    apiApp.use(middleware.api.versionMatch);

    // ## CORS pre-flight check
    apiApp.options('*', middleware.api.cors);

    // API shouldn't be cached
    apiApp.use(middleware.cacheControl('private'));

    // Routing
    apiApp.use(apiRoutes());

    // API error handling
    // @TODO: split the API error handling into its own thing?
    apiApp.use(middleware.api.errorHandler);

    return apiApp;
};
