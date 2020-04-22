const cors = require('cors');
const auth = require('../../../../services/auth');
const shared = require('../../../shared');

/**
 * Auth Middleware Packages
 *
 * IMPORTANT
 * - cors middleware MUST happen before pretty urls, because otherwise cors header can get lost on redirect
 * - url redirects MUST happen after cors, otherwise cors header can get lost on redirect
 */

/**
 * Authentication for public endpoints
 */
module.exports.authenticatePublic = [
    shared.middlewares.brute.contentApiKey,
    auth.authenticate.authenticateContentApi,
    auth.authorize.authorizeContentApi,
    cors(),
    shared.middlewares.urlRedirects.adminSSLAndHostRedirect,
    shared.middlewares.prettyUrls
];
