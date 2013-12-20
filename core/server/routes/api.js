var middleware  = require('../middleware').middleware,
    api         = require('../api');

module.exports = function (server) {
    // ### API routes
    /* TODO: auth should be public auth not user auth */
    // #### Posts
    server.get('/ghost/api/v0.1/posts', middleware.authAPI, api.requestHandler(api.posts.browse));
    server.post('/ghost/api/v0.1/posts', middleware.authAPI, api.requestHandler(api.posts.add));
    server.get('/ghost/api/v0.1/posts/:id', middleware.authAPI, api.requestHandler(api.posts.read));
    server.put('/ghost/api/v0.1/posts/:id', middleware.authAPI, api.requestHandler(api.posts.edit));
    server.del('/ghost/api/v0.1/posts/:id', middleware.authAPI, api.requestHandler(api.posts.destroy));
    server.get('/ghost/api/v0.1/posts/getSlug/:title', middleware.authAPI, api.requestHandler(api.posts.getSlug));
    // #### Settings
    server.get('/ghost/api/v0.1/settings/', middleware.authAPI, api.requestHandler(api.settings.browse));
    server.get('/ghost/api/v0.1/settings/:key/', middleware.authAPI, api.requestHandler(api.settings.read));
    server.put('/ghost/api/v0.1/settings/', middleware.authAPI, api.requestHandler(api.settings.edit));
    // #### Users
    server.get('/ghost/api/v0.1/users/', middleware.authAPI, api.requestHandler(api.users.browse));
    server.get('/ghost/api/v0.1/users/:id/', middleware.authAPI, api.requestHandler(api.users.read));
    server.put('/ghost/api/v0.1/users/:id/', middleware.authAPI, api.requestHandler(api.users.edit));
    // #### Tags
    server.get('/ghost/api/v0.1/tags/', middleware.authAPI, api.requestHandler(api.tags.all));
    // #### Notifications
    server.del('/ghost/api/v0.1/notifications/:id', middleware.authAPI, api.requestHandler(api.notifications.destroy));
    server.post('/ghost/api/v0.1/notifications/', middleware.authAPI, api.requestHandler(api.notifications.add));
    // #### Import/Export
    server.get('/ghost/api/v0.1/db/', middleware.auth, api.db.exportContent);
    server.post('/ghost/api/v0.1/db/', middleware.authAPI, middleware.busboy, api.requestHandler(api.db.importContent));
    server.del('/ghost/api/v0.1/db/', middleware.authAPI, api.requestHandler(api.db.deleteAllContent));
};