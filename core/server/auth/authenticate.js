var passport = require('passport'),
    errors = require('../errors'),
    events = require('../events'),
    i18n = require('../i18n'),
    authenticate;

function isBearerAutorizationHeader(req) {
    var parts,
        scheme,
        credentials;

    if (req.headers && req.headers.authorization) {
        parts = req.headers.authorization.split(' ');
    } else if (req.query && req.query.access_token) {
        return true;
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

authenticate = {
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
            errors.logError(
                i18n.t('errors.middleware.auth.clientAuthenticationFailed'),
                i18n.t('errors.middleware.auth.clientCredentialsNotProvided'),
                i18n.t('errors.middleware.auth.forInformationRead', {url: 'http://api.ghost.org/docs/client-authentication'})
            );
            return errors.handleAPIError(new errors.UnauthorizedError(i18n.t('errors.middleware.auth.accessDenied')), req, res, next);
        }

        return passport.authenticate(['oauth2-client-password'], {session: false, failWithError: false},
            function authenticate(err, client) {
                if (err) {
                    return next(err); // will generate a 500 error
                }

                // req.body needs to be null for GET requests to build options correctly
                delete req.body.client_id;
                delete req.body.client_secret;

                if (!client) {
                    errors.logError(
                        i18n.t('errors.middleware.auth.clientAuthenticationFailed'),
                        i18n.t('errors.middleware.auth.clientCredentialsNotValid'),
                        i18n.t('errors.middleware.auth.forInformationRead', {url: 'http://api.ghost.org/docs/client-authentication'})
                    );
                    return errors.handleAPIError(new errors.UnauthorizedError(i18n.t('errors.middleware.auth.accessDenied')), req, res, next);
                }

                req.client = client;

                events.emit('client.authenticated', client);
                return next(null, client);
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

                    events.emit('user.authenticated', user);
                    return next(null, user, info);
                } else if (isBearerAutorizationHeader(req)) {
                    return errors.handleAPIError(new errors.UnauthorizedError(i18n.t('errors.middleware.auth.accessDenied')), req, res, next);
                } else if (req.client) {
                    req.user = {id: 0};
                    return next();
                }

                return errors.handleAPIError(new errors.UnauthorizedError(i18n.t('errors.middleware.auth.accessDenied')), req, res, next);
            }
        )(req, res, next);
    },

    // ### Authenticate Ghost.org User
    authenticateGhostUser: function authenticateGhostUser(req, res, next) {
        req.query.code = req.body.authorizationCode;

        if (!req.query.code) {
            return errors.handleAPIError(new errors.UnauthorizedError(i18n.t('errors.middleware.auth.accessDenied')), req, res, next);
        }

        passport.authenticate('ghost', {session: false, failWithError: false}, function authenticate(err, user, info) {
            if (err) {
                return next(err);
            }

            if (!user) {
                return errors.handleAPIError(new errors.UnauthorizedError(i18n.t('errors.middleware.auth.accessDenied')), req, res, next);
            }

            req.authInfo = info;
            req.user = user;
            next();
        })(req, res, next);
    }
};

module.exports = authenticate;
