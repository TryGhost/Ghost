var oauth2orize = require('oauth2orize'),
    models      = require('../models'),
    utils       = require('../utils'),
    errors      = require('../errors'),

    oauth;

oauth = {

    init: function init(oauthServer, resetSpamCounter) {
        // remove all expired accesstokens on startup
        models.Accesstoken.destroyAllExpired();

        // remove all expired refreshtokens on startup
        models.Refreshtoken.destroyAllExpired();

        // Exchange user id and password for access tokens.  The callback accepts the
        // `client`, which is exchanging the user's name and password from the
        // authorization request for verification. If these values are validated, the
        // application issues an access token on behalf of the user who authorized the code.
        oauthServer.exchange(oauth2orize.exchange.password(function exchange(client, username, password, scope, done) {
            // Validate the client
            models.Client.forge({slug: client.slug})
            .fetch()
            .then(function then(client) {
                if (!client) {
                    return done(new errors.NoPermissionError('Invalid client.'), false);
                }
                // Validate the user
                return models.User.check({email: username, password: password}).then(function then(user) {
                    // Everything validated, return the access- and refreshtoken
                    var accessToken = utils.uid(256),
                        refreshToken = utils.uid(256),
                        accessExpires = Date.now() + utils.ONE_HOUR_MS,
                        refreshExpires = Date.now() + utils.ONE_WEEK_MS;

                    return models.Accesstoken.add(
                        {token: accessToken, user_id: user.id, client_id: client.id, expires: accessExpires}
                    ).then(function then() {
                        return models.Refreshtoken.add(
                            {token: refreshToken, user_id: user.id, client_id: client.id, expires: refreshExpires}
                        );
                    }).then(function then() {
                        resetSpamCounter(username);
                        return done(null, accessToken, refreshToken, {expires_in: utils.ONE_HOUR_S});
                    }).catch(function handleError(error) {
                        return done(error, false);
                    });
                }).catch(function handleError(error) {
                    return done(error);
                });
            });
        }));

        // Exchange the refresh token to obtain an access token.  The callback accepts the
        // `client`, which is exchanging a `refreshToken` previously issued by the server
        // for verification. If these values are validated, the application issues an
        // access token on behalf of the user who authorized the code.
        oauthServer.exchange(oauth2orize.exchange.refreshToken(function exchange(client, refreshToken, scope, done) {
            models.Refreshtoken.forge({token: refreshToken})
            .fetch()
            .then(function then(model) {
                if (!model) {
                    return done(new errors.NoPermissionError('Invalid refresh token.'), false);
                } else {
                    var token = model.toJSON(),
                        accessToken = utils.uid(256),
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
                        done(new errors.UnauthorizedError('Refresh token expired.'), false);
                    }
                }
            });
        }));
    }
};

module.exports = oauth;
