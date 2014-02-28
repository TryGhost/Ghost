var middleware  = require('../middleware').middleware,
    api         = require('../api');

module.exports = function (server) {
    // ### API routes
    // #### Posts
    server.get('/ghost/api/v0.1/posts', api.requestHandler(api.posts.browse));
    server.post('/ghost/api/v0.1/posts', api.requestHandler(api.posts.add));
    server.get('/ghost/api/v0.1/posts/:id', api.requestHandler(api.posts.read));
    server.put('/ghost/api/v0.1/posts/:id', api.requestHandler(api.posts.edit));
    server.del('/ghost/api/v0.1/posts/:id', api.requestHandler(api.posts.destroy));
    server.get('/ghost/api/v0.1/posts/getSlug/:title', middleware.authAPI, api.requestHandler(api.posts.getSlug));
    // #### Settings
    server.get('/ghost/api/v0.1/settings/', api.requestHandler(api.settings.browse));
    server.get('/ghost/api/v0.1/settings/:key/', api.requestHandler(api.settings.read));
    server.put('/ghost/api/v0.1/settings/', api.requestHandler(api.settings.edit));
    // #### Users
    server.get('/ghost/api/v0.1/users/', api.requestHandler(api.users.browse));
    server.get('/ghost/api/v0.1/users/:id/', api.requestHandler(api.users.read));
    server.put('/ghost/api/v0.1/users/:id/', api.requestHandler(api.users.edit));
    // #### Tags
    server.get('/ghost/api/v0.1/tags/', api.requestHandler(api.tags.browse));
    // #### Notifications
    server.del('/ghost/api/v0.1/notifications/:id', api.requestHandler(api.notifications.destroy));
    server.post('/ghost/api/v0.1/notifications/', api.requestHandler(api.notifications.add));
    // #### Import/Export
    server.get('/ghost/api/v0.1/db/', api.requestHandler(api.db.exportContent));
    server.post('/ghost/api/v0.1/db/', middleware.busboy, api.requestHandler(api.db.importContent));
    server.del('/ghost/api/v0.1/db/', api.requestHandler(api.db.deleteAllContent));
};