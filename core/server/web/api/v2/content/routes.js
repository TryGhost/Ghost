const express = require('express');
// This essentially provides the controllers for the routes
const api = require('../../../../api');

// API specific
const cors = require('../../../shared/middlewares/api/cors');

// Temporary
// @TODO find a more appy way to do this!
const labs = require('../../../shared/middlewares/labs');

const prettyURLs = require('../../../shared/middlewares/pretty-urls');
const {adminRedirect} = require('../../../shared/middlewares/url-redirects');
const auth = require('../../../../services/auth');

/**
 * Auth Middleware Packages
 *
 * IMPORTANT
 * - cors middleware MUST happen before pretty urls, because otherwise cors header can get lost on redirect
 * - cors middleware MUST happen after authenticateClient, because authenticateClient reads the trusted domains
 * - url redirects MUST happen after cors, otherwise cors header can get lost on redirect
 */

/**
 * Authentication for public endpoints
 */
const authenticatePublic = [
    auth.authenticate.authenticateClient,
    auth.authenticate.authenticateUser,
    // This is a labs-enabled middleware
    auth.authorize.requiresAuthorizedUserPublicAPI,
    cors,
    adminRedirect,
    prettyURLs
];

module.exports = function apiRoutes() {
    const router = express.Router();

    // alias delete with del
    router.del = router.delete;

    // ## CORS pre-flight check
    router.options('*', cors);

    // ## Configuration
    router.get('/configuration', api.http(api.configuration.read));

    // ## Posts
    router.get('/posts', authenticatePublic, api.http(api.posts.browse));
    router.get('/posts/:id', authenticatePublic, api.http(api.posts.read));
    router.get('/posts/slug/:slug', authenticatePublic, api.http(api.posts.read));

    // ## Users
    router.get('/users', authenticatePublic, api.http(api.users.browse));
    router.get('/users/:id', authenticatePublic, api.http(api.users.read));
    router.get('/users/slug/:slug', authenticatePublic, api.http(api.users.read));

    // ## Tags
    router.get('/tags', authenticatePublic, api.http(api.tags.browse));
    router.get('/tags/:id', authenticatePublic, api.http(api.tags.read));
    router.get('/tags/slug/:slug', authenticatePublic, api.http(api.tags.read));

    // ## Subscribers
    router.post('/subscribers', labs.subscribers, authenticatePublic, api.http(api.subscribers.add));

    // ## Clients
    router.get('/clients/slug/:slug', api.http(api.clients.read));

    return router;
};
