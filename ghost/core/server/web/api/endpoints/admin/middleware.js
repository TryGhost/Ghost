const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const auth = require('../../../../auth');
const shared = require('../../../shared');
const apiMw = require('../../middleware');
const { routedMethod } = require('@tryghost/api-framework');
const apiPermissions = require('../../../../api/endpoints/utils/permissions');

const messages = {
  apiTokenBlocked: 'API tokens do not have permission to access this endpoint',
  staffTokenBlocked: 'Staff tokens are not allowed to access this endpoint',
  appTokenBlocked: 'Apps are not allowed to access this endpoint',
};

/**
 * The endpoints a token acting for a staff user may never call, whatever the user's role:
 * deleting all content, transferring ownership and resetting authentication.
 *
 * @param {import('express').Request} req
 */
const isBlockedForStaffTokens = (req) => {
  // Express matches routes case-insensitively but req.path preserves the
  // original case. Normalise before comparing so a mixed-case URL can't
  // slip past the blocklist while still routing to the lowercase handler.
  // Match both with and without trailing slash since Express routes accept both
  const path = req.path.toLowerCase();
  const isDeleteAllContent = req.method === 'DELETE' && (path === '/db/' || path === '/db');
  const isTransferOwnership =
    req.method === 'PUT' && (path === '/users/owner/' || path === '/users/owner');
  const isResetAuthentication =
    req.method === 'POST' &&
    (path === '/authentication/reset/' || path === '/authentication/reset');
  return isDeleteAllContent || isTransferOwnership || isResetAuthentication;
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const tokenPermissionCheck = function tokenPermissionCheck(req, res, next) {
  // CASE: an app acting for a staff user, held to the staff token blocklist, else skip to
  // permission system
  if (req.auth?.kind === 'app') {
    if (isBlockedForStaffTokens(req)) {
      return next(
        new errors.NoPermissionError({
          message: tpl(messages.appTokenBlocked),
        }),
      );
    }
    return next();
  }

  // CASE: user is logged in with user auth, skip to permission system
  if (!req.api_key) {
    return next();
  }

  // CASE: user is requesting with staff token, check blocklist, else skip to permission system
  // Staff tokens have a user_id associated with them, integration tokens don't
  if (req.api_key?.get('user_id')) {
    if (isBlockedForStaffTokens(req)) {
      return next(
        new errors.NoPermissionError({
          message: tpl(messages.staffTokenBlocked),
        }),
      );
    }

    return next();
  }

  // CASE: god mode is enabled & we're in development, skip to permission system
  if (req.query.god_mode && process.env.NODE_ENV === 'development') {
    return next();
  }

  // CASE: we're using an integration token, check allowlist for permitted endpoints
  const allowlisted = {
    site: ['GET'],
    posts: ['GET', 'PUT', 'DELETE', 'POST'],
    pages: ['GET', 'PUT', 'DELETE', 'POST'],
    images: ['POST'],
    webhooks: ['POST', 'PUT', 'DELETE'],
    actions: ['GET'],
    tags: ['GET', 'PUT', 'DELETE', 'POST'],
    labels: ['GET', 'PUT', 'DELETE', 'POST'],
    users: ['GET'],
    roles: ['GET'],
    invites: ['POST'],
    themes: ['POST', 'PUT'],
    members: ['GET', 'PUT', 'DELETE', 'POST'],
    tiers: ['GET', 'PUT', 'POST'],
    offers: ['GET', 'PUT', 'POST'],
    newsletters: ['GET', 'PUT', 'POST'],
    automations: ['POST', 'PUT'],
    config: ['GET'],
    schedules: ['PUT'],
    gifts: ['PUT'],
    files: ['POST'],
    media: ['POST'],
    db: ['GET', 'POST'],
    settings: ['GET'],
    segments: ['GET'],
    comments: ['GET', 'POST', 'PUT'],
    oembed: ['GET'],
    'search-index': ['GET'],
  };

  const match = req.url.match(/^\/([^/?]+)\/?/);

  if (match) {
    const entity = match[1];

    if (allowlisted[entity] && allowlisted[entity].includes(req.method)) {
      return next();
    }
  }

  next(
    new errors.NoPermissionError({
      message: tpl(messages.apiTokenBlocked),
      statusCode: 403,
    }),
  );
};

/**
 * The handlers a route runs for a request's method, picked as Express picks them: the layers for
 * that verb or for every verb, with HEAD served by GET when the route has no HEAD of its own
 *
 * @param {{stack: {method?: string, handle: Function}[], methods: Record<string, boolean>}} route
 * @param {string} method
 */
const routeHandlers = (route, method) => {
  let verb = method.toLowerCase();
  if (verb === 'head' && !route.methods.head) {
    verb = 'get';
  }
  return route.stack
    .filter((layer) => !layer.method || layer.method === verb)
    .map((layer) => layer.handle);
};

/**
 * Refuses an app the method its route ends in would refuse it on, before the route's own
 * middleware runs: a rate limit keyed on the staff user the app acts for, or an upload being
 * parsed and stored. The method is the last handler the route runs for the request's verb, from
 * `http()`.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const refuseAppEarly = function refuseAppEarly(req, res, next) {
  if (req.auth?.kind !== 'app') {
    return next();
  }
  const routed = req.route && routedMethod(routeHandlers(req.route, req.method).at(-1));
  if (!routed) {
    return next();
  }
  apiPermissions.refuseAppEarly(routed, req.auth).then(() => next(), next);
};

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
  tokenPermissionCheck,
  refuseAppEarly,
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
  tokenPermissionCheck,
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
  tokenPermissionCheck,
];

module.exports.routeHandlers = routeHandlers;
