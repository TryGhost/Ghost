var passport = require('passport'),
    authUtils = require('./utils'),
    errors = require('../errors'),
    models = require('../models'),
    events = require('../events'),
    i18n = require('../i18n'),
    authenticate;

authenticate = {
    // ### Authenticate Client Middleware
    authenticateClient: function authenticateClient(req, res, next) {
        // skip client authentication if bearer token is present
        if (authUtils.getBearerAutorizationToken(req)) {
            return next();
        }

        if (req.query && req.query.client_id) {
            req.body.client_id = req.query.client_id;
        }

        if (req.query && req.query.client_secret) {
            req.body.client_secret = req.query.client_secret;
        }

        if (!req.body.client_id || !req.body.client_secret) {
            return next(new errors.UnauthorizedError({
                message: i18n.t('errors.middleware.auth.accessDenied'),
                context: i18n.t('errors.middleware.auth.clientCredentialsNotProvided'),
                help: i18n.t('errors.middleware.auth.forInformationRead', {url: 'http://api.ghost.org/docs/client-authentication'})
            }));
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
                    return next(new errors.UnauthorizedError({
                        message: i18n.t('errors.middleware.auth.accessDenied'),
                        context: i18n.t('errors.middleware.auth.clientCredentialsNotValid'),
                        help: i18n.t('errors.middleware.auth.forInformationRead', {url: 'http://api.ghost.org/docs/client-authentication'})
                    }));
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
                } else if (authUtils.getBearerAutorizationToken(req)) {
                    return next(new errors.UnauthorizedError({
                        message: i18n.t('errors.middleware.auth.accessDenied')
                    }));
                } else if (req.client) {
                    req.user = {id: models.User.externalUser};
                    return next();
                }

                return next(new errors.UnauthorizedError({
                    message: i18n.t('errors.middleware.auth.accessDenied')
                }));
            }
        )(req, res, next);
    }
};

module.exports = authenticate;
