const errors = require('@tryghost/errors');
const {i18n} = require('../../../../lib/common');
const auth = require('../../../../services/auth');
const shared = require('../../../shared');
const apiMw = require('../../middleware');

const notImplemented = function (req, res, next) {
    // CASE: user is logged in, allow
    if (!req.api_key) {
        return next();
    }

    // @NOTE: integrations have limited access for now
    const allowlisted = {
        // @NOTE: stable
        site: ['GET'],
        posts: ['GET', 'PUT', 'DELETE', 'POST'],
        pages: ['GET', 'PUT', 'DELETE', 'POST'],
        images: ['POST'],
        webhooks: ['POST', 'PUT', 'DELETE'],
        // @NOTE: experimental
        actions: ['GET'],
        tags: ['GET', 'PUT', 'DELETE', 'POST'],
        labels: ['GET', 'PUT', 'DELETE', 'POST'],
        users: ['GET'],
        themes: ['POST', 'PUT'],
        members: ['GET', 'PUT', 'DELETE', 'POST'],
        config: ['GET'],
        schedules: ['PUT'],
        db: ['POST']
    };

    const match = req.url.match(/^\/(\w+)\/?/);

    if (match) {
        const entity = match[1];

        if (allowlisted[entity] && allowlisted[entity].includes(req.method)) {
            return next();
        }
    }

    next(new errors.GhostError({
        errorType: 'NotImplementedError',
        message: i18n.t('errors.api.common.notImplemented'),
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
    shared.middlewares.urlRedirects.adminSSLAndHostRedirect,
    shared.middlewares.prettyUrls,
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
    shared.middlewares.urlRedirects.adminSSLAndHostRedirect,
    shared.middlewares.prettyUrls,
    notImplemented
];

/**
 * Middleware for public admin endpoints
 */
module.exports.publicAdminApi = [
    apiMw.cors,
    shared.middlewares.urlRedirects.adminSSLAndHostRedirect,
    shared.middlewares.prettyUrls,
    notImplemented
];
