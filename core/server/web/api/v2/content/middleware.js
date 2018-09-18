const auth = require('../../../../services/auth');
const shared = require('../../../shared');

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
    auth.auth.contentAPI,
    shared.middlewares.api.cors,
    shared.middlewares.urlRedirects.adminRedirect,
    shared.middlewares.prettyUrls
];
