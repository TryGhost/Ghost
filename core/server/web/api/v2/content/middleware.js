const prettyURLs = require('../../../middleware/pretty-urls'),
    cors = require('../../../middleware/api/cors'),
    urlRedirects = require('../../../middleware/url-redirects'),
    auth = require('../../../../services/auth');

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
