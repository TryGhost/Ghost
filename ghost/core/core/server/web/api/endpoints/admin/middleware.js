const auth = require('../../../../services/auth');
const shared = require('../../../shared');
const apiMw = require('../../middleware');

/** @typedef {import('express').RequestHandler} RequestHandler */

/**
 * Authentication for private endpoints
 *
 * @type {RequestHandler[]}
 */
module.exports.authAdminApi = [
  auth.authenticate.authenticateAdminApi,
  auth.authorize.authorizeAdminApi,
  apiMw.updateUserLastSeen,
  apiMw.cors,
  shared.middleware.urlRedirects.adminSSLAndHostRedirect,
  shared.middleware.prettyUrls,
];

/**
 * Authentication for private endpoints with token in URL
 * Ex.: For scheduler publish endpoint
 *
 * @type {RequestHandler[]}
 */
module.exports.authAdminApiWithUrl = [
  auth.authenticate.authenticateAdminApiWithUrl,
  auth.authorize.authorizeAdminApi,
  apiMw.updateUserLastSeen,
  apiMw.cors,
  shared.middleware.urlRedirects.adminSSLAndHostRedirect,
  shared.middleware.prettyUrls,
];

/**
 * Middleware for public admin endpoints
 *
 * @type {RequestHandler[]}
 */
module.exports.publicAdminApi = [
  apiMw.cors,
  shared.middleware.urlRedirects.adminSSLAndHostRedirect,
  shared.middleware.prettyUrls,
];
