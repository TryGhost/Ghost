const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const auth = require('../../../../services/auth');
const shared = require('../../../shared');
const apiMw = require('../../middleware');

const messages = {
    notImplemented: 'The server does not support the functionality required to fulfill the request.'
};

const notImplemented = function notImplemented(req, res, next) {
    // CASE: user is logged in, allow
    if (!req.api_key) {
        return next();
    }

    if (req.query.god_mode && process.env.NODE_ENV === 'development') {
        return next();
    }

    // @NOTE: integrations & staff tokens have limited access to the API
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
        statusCode: '501'
    }));
};

/**
 * Authentication for private endpoints
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
 */
module.exports.publicAdminApi = [
    apiMw.cors,
    shared.middleware.urlRedirects.adminSSLAndHostRedirect,
    shared.middleware.prettyUrls,
    notImplemented
];
