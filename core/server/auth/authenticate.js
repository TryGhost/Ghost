var passport = require('passport'),
    authUtils = require('./utils'),
    models = require('../models'),
    common = require('../lib/common'),
    authenticate;

authenticate = {
    // ### Authenticate Client Middleware
    authenticateClient: function authenticateClient(req, res, next) {
        /**
         * In theory, client authentication is not required for public clients, only for confidential clients.
         * See e.g. https://tools.ietf.org/html/rfc6749#page-38. Ghost has no differentiation for this at the moment.
         * See also See https://tools.ietf.org/html/rfc6749#section-2.1.
         *
         * Ghost requires client authentication for `grant_type: password`, because we have to ensure that
         * we tie a client to a new access token. That means `grant_type: refresh_token` does not require
         * client authentication, because binding a client already happened.
         *
         * To sum up:
         *   - password authentication requires client authentication
         *   - refreshing a token does not require client authentication
         *   - public API requires client authentication
         *      - as soon as you send an access token in the header or via query
         *      - we deny public API access
         *   - API access with a Bearer does not require client authentication
         */
        if (authUtils.getBearerAutorizationToken(req) && !authUtils.hasGrantType(req, 'password')) {
            return next();
        }

        if (req.query && req.query.client_id) {
            req.body.client_id = req.query.client_id;
        }

        if (req.query && req.query.client_secret) {
            req.body.client_secret = req.query.client_secret;
        }

        if (!req.body.client_id || !req.body.client_secret) {
            return next(new common.errors.UnauthorizedError({
                message: common.i18n.t('errors.middleware.auth.accessDenied'),
                context: common.i18n.t('errors.middleware.auth.clientCredentialsNotProvided'),
                help: common.i18n.t('errors.middleware.auth.forInformationRead', {url: 'http://api.ghost.org/docs/client-authentication'})
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
                    return next(new common.errors.UnauthorizedError({
                        message: common.i18n.t('errors.middleware.auth.accessDenied'),
                        context: common.i18n.t('errors.middleware.auth.clientCredentialsNotValid'),
                        help: common.i18n.t('errors.middleware.auth.forInformationRead', {url: 'http://api.ghost.org/docs/client-authentication'})
                    }));
                }

                req.client = client;

                common.events.emit('client.authenticated', client);
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

                    common.events.emit('user.authenticated', user);
                    return next(null, user, info);
                } else if (authUtils.getBearerAutorizationToken(req)) {
                    return next(new common.errors.UnauthorizedError({
                        message: common.i18n.t('errors.middleware.auth.accessDenied')
                    }));
                } else if (req.client) {
                    req.user = {id: models.User.externalUser};
                    return next();
                }

                return next(new common.errors.UnauthorizedError({
                    message: common.i18n.t('errors.middleware.auth.accessDenied')
                }));
            }
        )(req, res, next);
    }
};

module.exports = authenticate;
