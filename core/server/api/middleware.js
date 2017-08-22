var prettyURLs = require('../middleware/pretty-urls'),
    cors = require('../middleware/api/cors'),
    auth = require('../auth');

/**
 * Auth Middleware Packages
 *
 * IMPORTANT
 * - cors middleware MUST happen before pretty urls, because otherwise cors header can get lost
 * - cors middleware MUST happen after authenticateClient, because authenticateClient reads the trusted domains
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
        prettyURLs
    ];
};
