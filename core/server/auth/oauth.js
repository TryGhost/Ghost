var oauth2orize = require('oauth2orize'),
    models = require('../models'),
    utils = require('../utils'),
    errors = require('../errors'),
    authenticationAPI = require('../api/authentication'),
    spamPrevention = require('../middleware/spam-prevention'),
    i18n = require('../i18n'),
    oauthServer,
    oauth;

function exchangeRefreshToken(client, refreshToken, scope, done) {
    models.Refreshtoken.findOne({token: refreshToken})
        .then(function then(model) {
            if (!model) {
                return done(new errors.NoPermissionError({message: i18n.t('errors.middleware.oauth.invalidRefreshToken')}), false);
            } else {
                var token = model.toJSON(),
                    accessToken = utils.uid(191),
                    accessExpires = Date.now() + utils.ONE_HOUR_MS,
                    refreshExpires = Date.now() + utils.ONE_WEEK_MS;

                if (token.expires > Date.now()) {
                    models.Accesstoken.add({
                        token: accessToken,
                        user_id: token.user_id,
                        client_id: token.client_id,
                        expires: accessExpires
                    }).then(function then() {
                        return models.Refreshtoken.edit({expires: refreshExpires}, {id: token.id});
                    }).then(function then() {
                        return done(null, accessToken, {expires_in: utils.ONE_HOUR_S});
                    }).catch(function handleError(error) {
                        return done(error, false);
                    });
                } else {
                    done(new errors.UnauthorizedError({message: i18n.t('errors.middleware.oauth.refreshTokenExpired')}), false);
                }
            }
        });
}

function exchangePassword(client, username, password, scope, done) {
    // Validate the client
    models.Client.findOne({slug: client.slug})
        .then(function then(client) {
            if (!client) {
                return done(new errors.NoPermissionError({message: i18n.t('errors.middleware.oauth.invalidClient')}), false);
            }

            // Validate the user
            return models.User.check({email: username, password: password})
                .then(function then(user) {
                    return authenticationAPI.createTokens({}, {context: {client_id: client.id, user: user.id}});
                })
                .then(function then(response) {
                    spamPrevention.resetCounter(username);
                    return done(null, response.access_token, response.refresh_token, {expires_in: response.expires_in});
                });
        })
        .catch(function handleError(error) {
            return done(error, false);
        });
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
    },

    // ### Generate access token Middleware
    // register the oauth2orize middleware for password and refresh token grants
    generateAccessToken: function generateAccessToken(req, res, next) {
        return oauthServer.token()(req, res, next);
    }
};

module.exports = oauth;
