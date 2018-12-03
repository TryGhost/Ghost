const auth = require('../../../../services/auth');
const shared = require('../../../shared');

/**
 * Authentication for private endpoints
 */
module.exports.authAdminApi = [
    auth.authenticate.authenticateAdminApi,
    auth.authorize.authorizeAdminApi,
    shared.middlewares.updateUserLastSeen,
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
