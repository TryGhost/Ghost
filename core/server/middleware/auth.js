var _           = require('lodash'),
    passport    = require('passport'),
    url         = require('url'),
    errors      = require('../errors'),
    config      = require('../config'),
    labs        = require('../utils/labs'),
    oauthServer,

    auth;

function cacheOauthServer(server) {
    oauthServer = server;
}

function isBearerAutorizationHeader(req) {
    var parts,
        scheme,
        credentials;

    if (req.headers && req.headers.authorization) {
        parts = req.headers.authorization.split(' ');
    } else {
        return false;
    }

    if (parts.length === 2) {
        scheme = parts[0];
        credentials = parts[1];
        if (/^Bearer$/i.test(scheme)) {
            return true;
        }
    }
    return false;
}

function isValidOrigin(origin, client) {
    if (origin && client && client.type === 'ua' && (
        _.some(client.trustedDomains, {trusted_domain: origin})
        || origin === url.parse(config.url).hostname
        || origin === url.parse(config.urlSSL ? config.urlSSL : '').hostname
    )) {
        return true;
    } else {
        return false;
    }
}

auth = {

    // ### Authenticate Client Middleware
    authenticateClient: function authenticateClient(req, res, next) {
        // skip client authentication if bearer token is present
        if (isBearerAutorizationHeader(req)) {
            return next();
        }

        if (req.query && req.query.client_id) {
            req.body.client_id = req.query.client_id;
        }

        if (req.query && req.query.client_secret) {
            req.body.client_secret = req.query.client_secret;
        }

        if (!req.body.client_id || !req.body.client_secret) {
            return errors.handleAPIError(new errors.UnauthorizedError('Access denied.'), req, res, next);
        }

        return passport.authenticate(['oauth2-client-password'], {session: false, failWithError: false},
            function authenticate(err, client) {
                var origin = null;
                if (err) {
                    return next(err); // will generate a 500 error
                }

                if (req.headers && req.headers.origin) {
                    origin = url.parse(req.headers.origin).hostname;
                }

                // req.body needs to be null for GET requests to build options correctly
                delete req.body.client_id;
                delete req.body.client_secret;

                if (!origin && client && client.type === 'ua') {
                    res.header('Access-Control-Allow-Origin', config.url);
                    req.client = client;
                    return next(null, client);
                }

                if (isValidOrigin(origin, client)) {
                    res.header('Access-Control-Allow-Origin', req.headers.origin);
                    req.client = client;
                    return next(null, client);
                } else {
                    return errors.handleAPIError(new errors.UnauthorizedError('Access denied.'), req, res, next);
                }
            }
        )(req, res, next);
    },

    // ### Authenticate User Middleware
    authenticateUser: function authenticateUser(req, res, next) {
        return passport.authenticate('bearer', {session: false, failWithError: false},
            function authenticate(err, user, info) {
                if (err) {
                    return next(err); // will generate a 500 error
                }

                if (user) {
                    req.authInfo = info;
                    req.user = user;
                    return next(null, user, info);
                } else if (isBearerAutorizationHeader(req)) {
                    return errors.handleAPIError(new errors.UnauthorizedError('Access denied.'), req, res, next);
                } else if (req.client) {
                    return next();
                }

                return errors.handleAPIError(new errors.UnauthorizedError('Access denied.'), req, res, next);
            }
        )(req, res, next);
    },

    // Workaround for missing permissions
    // TODO: rework when https://github.com/TryGhost/Ghost/issues/3911 is  done
    requiresAuthorizedUser: function requiresAuthorizedUser(req, res, next) {
        if (req.user) {
            return next();
        } else {
            return errors.handleAPIError(new errors.NoPermissionError('Please Sign In'), req, res, next);
        }
    },

    // ### Require user depending on public API being activated.
    requiresAuthorizedUserPublicAPI: function requiresAuthorizedUserPublicAPI(req, res, next) {
        return labs.isSet('publicAPI').then(function (publicAPI) {
            if (publicAPI === true) {
                return next();
            } else {
                if (req.user) {
                    return next();
                } else {
                    return errors.handleAPIError(new errors.NoPermissionError('Please Sign In'), req, res, next);
                }
            }
        });
    },

    // ### Generate access token Middleware
    // register the oauth2orize middleware for password and refresh token grants
    generateAccessToken: function generateAccessToken(req, res, next) {
        return oauthServer.token()(req, res, next);
    }
};

module.exports = auth;
module.exports.cacheOauthServer = cacheOauthServer;
