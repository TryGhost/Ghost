const prettyURLs = require('../../../middleware/pretty-urls'),
    cors = require('../../../middleware/api/cors'),
    urlRedirects = require('../../../middleware/url-redirects'),
    auth = require('../../../../services/auth');

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
