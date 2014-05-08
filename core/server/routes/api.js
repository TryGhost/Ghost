// # API routes
var middleware  = require('../middleware').middleware,
    api         = require('../api'),
    apiRoutes;

apiRoutes = function (server) {
    // ## Posts
    server.get('/ghost/api/v0.1/posts', api.http(api.posts.browse));
    server.post('/ghost/api/v0.1/posts', api.http(api.posts.add));
    server.get('/ghost/api/v0.1/posts/:id(\\d+)', api.http(api.posts.read));
    server.get('/ghost/api/v0.1/posts/:slug([a-z-]+)', api.http(api.posts.read));
    server.put('/ghost/api/v0.1/posts/:id', api.http(api.posts.edit));
    server.del('/ghost/api/v0.1/posts/:id', api.http(api.posts.destroy));
    server.get('/ghost/api/v0.1/posts/slug/:title', api.http(api.posts.generateSlug));
    // ## Settings
    server.get('/ghost/api/v0.1/settings/', api.http(api.settings.browse));
    server.get('/ghost/api/v0.1/settings/:key/', api.http(api.settings.read));
    server.put('/ghost/api/v0.1/settings/', api.http(api.settings.edit));
    // ## Users
    server.get('/ghost/api/v0.1/users/', api.http(api.users.browse));
    server.get('/ghost/api/v0.1/users/:id/', api.http(api.users.read));
    server.put('/ghost/api/v0.1/users/:id/', api.http(api.users.edit));
    // ## Tags
    server.get('/ghost/api/v0.1/tags/', api.http(api.tags.browse));
    // ## Themes
    server.get('/ghost/api/v0.1/themes/', api.http(api.themes.browse));
    server.put('/ghost/api/v0.1/themes/:name', api.http(api.themes.edit));
    // ## Notifications
    server.del('/ghost/api/v0.1/notifications/:id', api.http(api.notifications.destroy));
    server.post('/ghost/api/v0.1/notifications/', api.http(api.notifications.add));
    server.get('/ghost/api/v0.1/notifications/', api.http(api.notifications.browse));
    server.post('/ghost/api/v0.1/notifications/', api.http(api.notifications.add));
    server.del('/ghost/api/v0.1/notifications/:id', api.http(api.notifications.destroy));
    // ## DB
    server.get('/ghost/api/v0.1/db/', api.http(api.db.exportContent));
    server.post('/ghost/api/v0.1/db/', middleware.busboy, api.http(api.db.importContent));
    server.del('/ghost/api/v0.1/db/', api.http(api.db.deleteAllContent));
    // ## Mail
    server.post('/ghost/api/v0.1/mail', api.http(api.mail.send));
    server.post('/ghost/api/v0.1/mail/test', api.http(api.mail.sendTest));
};

module.exports = apiRoutes;