var oauth2orize = require('oauth2orize'),
    _ = require('lodash'),
    passport = require('passport'),
    models = require('../../models'),
    authUtils = require('./utils'),
    web = require('../../web'),
    common = require('../../lib/common'),
    oauthServer,
    oauth;

function exchangeRefreshToken(client, refreshToken, scope, body, authInfo, done) {
    models.Base.transaction(function (transacting) {
        var options = {
            transacting: transacting
        };

        return models.Refreshtoken.findOne({token: refreshToken}, _.merge({forUpdate: true}, options))
            .then(function then(model) {
                if (!model) {
                    throw new common.errors.NoPermissionError({
                        message: common.i18n.t('errors.middleware.oauth.invalidRefreshToken')
                    });
                }

                var token = model.toJSON();

                if (token.expires <= Date.now()) {
                    throw new common.errors.UnauthorizedError({
                        message: common.i18n.t('errors.middleware.oauth.refreshTokenExpired')
                    });
                }

                // @TODO: this runs outside of the transaction
                web.shared.middlewares.api.spamPrevention.userLogin()
                    .reset(authInfo.ip, body.refresh_token + 'login');

                return authUtils.createTokens({
                    clientId: token.client_id,
                    userId: token.user_id,
                    oldAccessToken: authInfo.accessToken,
                    oldRefreshToken: refreshToken,
                    oldRefreshId: token.id
                }, options).then(function (response) {
                    return {
                        access_token: response.access_token,
                        expires_in: response.expires_in
                    };
                });
            });
    }).then(function (response) {
        done(null, response.access_token, {expires_in: response.expires_in});
    }).catch(function (err) {
        if (common.errors.utils.isIgnitionError(err)) {
            return done(err, false);
        }

        done(new common.errors.InternalServerError({
            err: err
        }), false);
    });
}

// We are required to pass in authInfo in order to reset spam counter for user login
function exchangePassword(client, username, password, scope, body, authInfo, done) {
    if (!client || !client.id) {
        return done(new common.errors.UnauthorizedError({
            message: common.i18n.t('errors.middleware.auth.clientCredentialsNotProvided')
        }), false);
    }

    // Validate the user
    return models.User.check({email: username, password: password})
        .then(function then(user) {
            return authUtils.createTokens({
                clientId: client.id,
                userId: user.id
            });
        })
        .then(function then(response) {
            web.shared.middlewares.api.spamPrevention.userLogin()
                .reset(authInfo.ip, username + 'login');

            return done(null, response.access_token, response.refresh_token, {expires_in: response.expires_in});
        })
        .catch(function (err) {
            done(err, false);
        });
}

function exchangeAuthorizationCode(req, res, next) {
    if (!req.body.authorizationCode) {
        return next(new common.errors.UnauthorizedError({
            message: common.i18n.t('errors.middleware.auth.accessDenied')
        }));
    }

    req.query.code = req.body.authorizationCode;

    passport.authenticate('ghost', {session: false, failWithError: false}, function authenticate(err, user) {
        if (err) {
            return next(err);
        }

        if (!user) {
            return next(new common.errors.UnauthorizedError({
                message: common.i18n.t('errors.middleware.auth.accessDenied')
            }));
        }

        web.shared.middlewares.api.spamPrevention.userLogin()
            .reset(req.authInfo.ip, req.body.authorizationCode + 'login');

        authUtils.createTokens({
            clientId: req.client.id,
            userId: user.id
        }).then(function then(response) {
            res.json({
                access_token: response.access_token,
                refresh_token: response.refresh_token,
                expires_in: response.expires_in
            });
        }).catch(function (err) {
            next(err);
        });
    })(req, res, next);
}

oauth = {

    init: function init() {
        oauthServer = oauth2orize.createServer();
        // remove all expired accesstokens on startup
        models.Accesstoken.destroyAllExpired();

        // remove all expired refreshtokens on startup
        models.Refreshtoken.destroyAllExpired();

        // Exchange user id and password for access tokens.  The callback accepts the
        // `client`, which is exchanging the user's name and password from the
        // authorization request for verification. If these values are validated, the
        // application issues an access token on behalf of the user who authorized the code.
        oauthServer.exchange(oauth2orize.exchange.password({userProperty: 'client'},
            exchangePassword));

        // Exchange the refresh token to obtain an access token.  The callback accepts the
        // `client`, which is exchanging a `refreshToken` previously issued by the server
        // for verification. If these values are validated, the application issues an
        // access token on behalf of the user who authorized the code.
        oauthServer.exchange(oauth2orize.exchange.refreshToken({userProperty: 'client'},
            exchangeRefreshToken));

        /**
         * Exchange authorization_code for an access token.
         * We forward to authorization code to Ghost.org.
         *
         * oauth2orize offers a default implementation via exchange.authorizationCode, but this function
         * wraps the express request and response. So no chance to get access to it.
         * We use passport to communicate with Ghost.org. Passport's module design requires the express req/res.
         *
         * For now it's OK to not use exchange.authorizationCode. You can read through the implementation here:
         * https://github.com/jaredhanson/oauth2orize/blob/master/lib/exchange/authorizationCode.js
         * As you can see, it does some validation and set's some headers, not very very important,
         * but it's part of the oauth2 spec.
         *
         * @TODO: How to use exchange.authorizationCode in combination of passport?
         */
        oauthServer.exchange('authorization_code', exchangeAuthorizationCode);
    },

    // ### Generate access token Middleware
    // register the oauth2orize middleware for password and refresh token grants
    generateAccessToken: function generateAccessToken(req, res, next) {
        /**
         * TODO:
         * https://github.com/jaredhanson/oauth2orize/issues/182
         * oauth2orize only offers the option to forward request information via authInfo object
         *
         * Important: only used for resetting the brute count (access to req.ip)
         */
        req.authInfo = {
            ip: req.ip,
            accessToken: authUtils.getBearerAutorizationToken(req)
        };

        return oauthServer.token()(req, res, function (err) {
            if (err && err.status === 400) {
                err = new common.errors.BadRequestError({err: err, message: err.message});
            }

            next(err);
        });
    }
};

module.exports = oauth;
