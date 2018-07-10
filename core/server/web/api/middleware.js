const prettyURLs = require('../middleware/pretty-urls'),
    cors = require('../middleware/api/cors'),
    urlRedirects = require('../middleware/url-redirects'),
    auth = require('../../services/auth');

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
module.exports.authenticatePublic = [
    auth.authenticate.authenticateClient,
    auth.authenticate.authenticateUser,
    // This is a labs-enabled middleware
    auth.authorize.requiresAuthorizedUserPublicAPI,
    cors,
    urlRedirects,
    prettyURLs
];

/**
 * Authentication for private endpoints
 */
module.exports.authenticatePrivate = [
    auth.authenticate.authenticateClient,
    auth.authenticate.authenticateUser,
    auth.authorize.requiresAuthorizedUser,
    cors,
    urlRedirects,
    prettyURLs
];

/**
 * Authentication for client endpoints
 */
module.exports.authenticateClient = function authenticateClient(client) {
    return [
        auth.authenticate.authenticateClient,
        auth.authenticate.authenticateUser,
        auth.authorize.requiresAuthorizedClient(client),
        cors,
        urlRedirects,
        prettyURLs
    ];
};
