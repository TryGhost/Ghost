const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const auth = require('../../../../services/auth');
const shared = require('../../../shared');
const apiMw = require('../../middleware');

const messages = {
    notImplemented: 'The server does not support the functionality required to fulfill the request.'
};

const notImplemented = function (req, res, next) {
    // CASE: user is logged in, allow
    if (!req.api_key) {
        return next();
    }

    // @NOTE: integrations have limited access for now
    //        all APIs are considered to be in "maintenance" stability index
    const allowlisted = {
        site: ['GET'],
        posts: ['GET', 'PUT', 'DELETE', 'POST'],
        pages: ['GET', 'PUT', 'DELETE', 'POST'],
        images: ['POST'],
        webhooks: ['POST', 'PUT', 'DELETE'],
        tags: ['GET', 'PUT', 'DELETE', 'POST'],
        users: ['GET'],
        themes: ['POST', 'PUT'],
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
