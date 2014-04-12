// # API routes
var express     = require('express'),
    api         = require('../api'),
    apiRoutes;

apiRoutes = function (middleware) {
    var router = express.Router();

    // ## Posts
    router.get('/ghost/api/v0.1/posts', api.http(api.posts.browse));
    router.post('/ghost/api/v0.1/posts', api.http(api.posts.add));
    router.get('/ghost/api/v0.1/posts/:id(\\d+)', api.http(api.posts.read));
    router.get('/ghost/api/v0.1/posts/:slug([a-z-]+)', api.http(api.posts.read));
    router.put('/ghost/api/v0.1/posts/:id', api.http(api.posts.edit));
    router['delete']('/ghost/api/v0.1/posts/:id', api.http(api.posts.destroy));
    // ## Settings
    router.get('/ghost/api/v0.1/settings/', api.http(api.settings.browse));
    router.get('/ghost/api/v0.1/settings/:key/', api.http(api.settings.read));
    router.put('/ghost/api/v0.1/settings/', api.http(api.settings.edit));
    // ## Users
    router.get('/ghost/api/v0.1/users/', api.http(api.users.browse));
    router.get('/ghost/api/v0.1/users/:id/', api.http(api.users.read));
    router.put('/ghost/api/v0.1/users/:id/', api.http(api.users.edit));
    // ## Tags
    router.get('/ghost/api/v0.1/tags/', api.http(api.tags.browse));
    // ## Themes
    router.get('/ghost/api/v0.1/themes/', api.http(api.themes.browse));
    router.put('/ghost/api/v0.1/themes/:name', api.http(api.themes.edit));
    // ## Notifications
    router.get('/ghost/api/v0.1/notifications/', api.http(api.notifications.browse));
    router.post('/ghost/api/v0.1/notifications/', api.http(api.notifications.add));
    router['delete']('/ghost/api/v0.1/notifications/:id', api.http(api.notifications.destroy));
    // ## DB
    router.get('/ghost/api/v0.1/db/', api.http(api.db.exportContent));
    router.post('/ghost/api/v0.1/db/', middleware.busboy, api.http(api.db.importContent));
    router['delete']('/ghost/api/v0.1/db/', api.http(api.db.deleteAllContent));
    // ## Mail
    router.post('/ghost/api/v0.1/mail', api.http(api.mail.send));
    router.post('/ghost/api/v0.1/mail/test', api.http(api.mail.sendTest));
    // #### Slugs
    router.get('/ghost/api/v0.1/slugs/:type/:name', api.http(api.slugs.generate));

    return router;
};

module.exports = apiRoutes;
