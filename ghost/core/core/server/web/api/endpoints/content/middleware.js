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
 *
 * @type {import('express').RequestHandler[]}
 */
module.exports.authenticatePublic = [
    shared.middleware.brute.contentApiKey,
    auth.authenticate.authenticateContentApi,
    auth.authorize.authorizeContentApi,
    cors(),
    shared.middleware.urlRedirects.adminSSLAndHostRedirect,
    shared.middleware.prettyUrls
];
