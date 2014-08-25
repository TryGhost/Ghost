// # API routes
var express     = require('express'),
    api         = require('../api'),
    apiRoutes;

apiRoutes = function (middleware) {
    var router = express.Router();
    // alias delete with del
    router.del = router.delete;

    // ## Configuration
    router.get('/configuration', api.http(api.configuration.browse));
    router.get('/configuration/:key', api.http(api.configuration.read));

    // ## Posts
    router.get('/posts', api.http(api.posts.browse));
    router.post('/posts', api.http(api.posts.add));
    router.get('/posts/:id', api.http(api.posts.read));
    router.get('/posts/slug/:slug', api.http(api.posts.read));
    router.put('/posts/:id', api.http(api.posts.edit));
    router.del('/posts/:id', api.http(api.posts.destroy));

    // ## Settings
    router.get('/settings', api.http(api.settings.browse));
    router.get('/settings/:key', api.http(api.settings.read));
    router.put('/settings', api.http(api.settings.edit));

    // ## Users
    router.get('/users', api.http(api.users.browse));
    router.get('/users/:id', api.http(api.users.read));
    router.get('/users/slug/:slug', api.http(api.users.read));
    router.get('/users/email/:email', api.http(api.users.read));
    router.put('/users/password', api.http(api.users.changePassword));
    router.put('/users/owner', api.http(api.users.transferOwnership));
    router.put('/users/:id', api.http(api.users.edit));
    router.post('/users', api.http(api.users.add));
    router.del('/users/:id', api.http(api.users.destroy));

    // ## Tags
    router.get('/tags', api.http(api.tags.browse));

    // ## Roles
    router.get('/roles/', api.http(api.roles.browse));

    // ## Slugs
    router.get('/slugs/:type/:name', api.http(api.slugs.generate));

    // ## Themes
    router.get('/themes', api.http(api.themes.browse));
    router.put('/themes/:name', api.http(api.themes.edit));

    // ## Notifications
    router.get('/notifications', api.http(api.notifications.browse));
    router.post('/notifications', api.http(api.notifications.add));
    router.del('/notifications/:id', api.http(api.notifications.destroy));

    // ## DB
    router.get('/db', api.http(api.db.exportContent));
    router.post('/db', middleware.busboy, api.http(api.db.importContent));
    router.del('/db', api.http(api.db.deleteAllContent));

    // ## Mail
    router.post('/mail', api.http(api.mail.send));
    router.post('/mail/test', function (req, res) {
        api.http(api.mail.sendTest)(req, res);
    });

    // ## Authentication
    router.post('/authentication/passwordreset',
        middleware.spamForgottenPrevention,
        api.http(api.authentication.generateResetToken)
    );
    router.put('/authentication/passwordreset', api.http(api.authentication.resetPassword));
    router.post('/authentication/invitation', api.http(api.authentication.acceptInvitation));
    router.get('/authentication/invitation', api.http(api.authentication.isInvitation));
    router.post('/authentication/setup', api.http(api.authentication.setup));
    router.get('/authentication/setup', api.http(api.authentication.isSetup));
    router.post('/authentication/token',
        middleware.spamSigninPrevention,
        middleware.addClientSecret,
        middleware.authenticateClient,
        middleware.generateAccessToken
    );
    router.post('/authentication/revoke', api.http(api.authentication.revoke));

    // ## Uploads
    router.post('/uploads', middleware.busboy, api.http(api.uploads.add));

    return router;
};

module.exports = apiRoutes;
