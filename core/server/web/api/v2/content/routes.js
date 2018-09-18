const express = require('express'),
    // This essentially provides the controllers for the routes
    api = require('../../../../api'),

    // Middleware
    mw = require('./middleware'),

    // API specific
    cors = require('../../../middleware/api/cors'),

    // Temporary
    // @TODO find a more appy way to do this!
    labs = require('../../../middleware/labs');

module.exports = function apiRoutes() {
    const router = express.Router();

    // alias delete with del
    router.del = router.delete;

    // ## CORS pre-flight check
    router.options('*', cors);

    // ## Configuration
    router.get('/configuration', api.http(api.configuration.read));

    // ## Posts
    router.get('/posts', mw.authenticatePublic, api.http(api.posts.browse));
    router.get('/posts/:id', mw.authenticatePublic, api.http(api.posts.read));
    router.get('/posts/slug/:slug', mw.authenticatePublic, api.http(api.posts.read));

    // ## Users
    router.get('/users', mw.authenticatePublic, api.http(api.users.browse));
    router.get('/users/:id', mw.authenticatePublic, api.http(api.users.read));
    router.get('/users/slug/:slug', mw.authenticatePublic, api.http(api.users.read));

    // ## Tags
    router.get('/tags', mw.authenticatePublic, api.http(api.tags.browse));
    router.get('/tags/:id', mw.authenticatePublic, api.http(api.tags.read));
    router.get('/tags/slug/:slug', mw.authenticatePublic, api.http(api.tags.read));

    // ## Subscribers
    router.post('/subscribers', labs.subscribers, mw.authenticatePublic, api.http(api.subscribers.add));

    // ## Clients
    router.get('/clients/slug/:slug', api.http(api.clients.read));

    return router;
};
