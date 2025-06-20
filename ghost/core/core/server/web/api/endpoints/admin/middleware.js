const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const auth = require('../../../../services/auth');
const shared = require('../../../shared');
const apiMw = require('../../middleware');

const messages = {
    notImplemented: 'The server does not support the functionality required to fulfill the request.',
    staffTokenBlocked: 'Staff tokens are not allowed to access this endpoint'
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const notImplemented = function notImplemented(req, res, next) {
    // CASE: user is logged in with user auth, skip to permission system
    if (!req.api_key) {
        return next();
    }

    // CASE: user is requesting with staff token, check blocklist, else skip to permission system
    // Staff tokens have a user_id associated with them, integration tokens don't
    if (req.api_key?.get('user_id')) {
        // Check if staff token is trying to access blocked endpoints
        const isDeleteAllContent = req.method === 'DELETE' && req.path === '/db/';
        const isTransferOwnership = req.method === 'PUT' && req.path === '/users/owner/';

        if (isDeleteAllContent || isTransferOwnership) {
            return next(new errors.NoPermissionError({
                message: tpl(messages.staffTokenBlocked)
            }));
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
        config: ['GET'],
        explore: ['GET'],
        schedules: ['PUT'],
        files: ['POST'],
        media: ['POST'],
        db: ['POST'],
        settings: ['GET'],
        oembed: ['GET']
    };

    const match = req.url.match(/^\/(\w+)\/?/);

    if (match) {
        const entity = match[1];

        if (allowlisted[entity] && allowlisted[entity].includes(req.method)) {
            return next();
        }
    }

    next(new errors.InternalServerError({
        errorType: 'NotImplementedError',
        message: tpl(messages.notImplemented),
        statusCode: 501
    }));
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
    notImplemented
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
    notImplemented
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
    notImplemented
];
