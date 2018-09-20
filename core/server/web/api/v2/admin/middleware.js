const auth = require('../../../../services/auth');
const shared = require('../../../shared');

/**
 * Authentication for private endpoints
 */
module.exports.authAdminAPI = [
    auth.authenticate.authenticateAdminAPI,
    auth.authorize.authorizeAdminAPI,
    shared.middlewares.api.cors,
    shared.middlewares.urlRedirects.adminRedirect,
    shared.middlewares.prettyUrls
];

/**
 * Authentication for client endpoints
 */
module.exports.authenticateClient = function authenticateClient(client) {
    return [
        auth.authenticate.authenticateClient,
        auth.authenticate.authenticateUser,
        auth.authorize.requiresAuthorizedClient(client),
        shared.middlewares.api.cors,
        shared.middlewares.urlRedirects.adminRedirect,
        shared.middlewares.prettyUrls
    ];
};
