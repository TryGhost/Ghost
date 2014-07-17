var oauth2orize = require('oauth2orize'),
    models      = require('../models'),
    utils       = require('../utils'),

    oauth;


oauth = {

    init: function (oauthServer) {

        // remove all expired accesstokens on startup
        models.Accesstoken.destroyAllExpired();

        // remove all expired refreshtokens on startup
        models.Refreshtoken.destroyAllExpired();

        // Exchange user id and password for access tokens.  The callback accepts the
        // `client`, which is exchanging the user's name and password from the
        // authorization request for verification. If these values are validated, the
        // application issues an access token on behalf of the user who authorized the code.
        oauthServer.exchange(oauth2orize.exchange.password(function (client, username, password, scope, done) {
            // Validate the client
            models.Client.forge({slug: client.slug})
            .fetch()
            .then(function (client) {
                if (!client) {
                    return done(null, false);
                }
                // Validate the user
                return models.User.check({email: username, password: password}).then(function (user) {

                    //Everything validated, return the access- and refreshtoken
                    var accessToken = utils.uid(256),
                        refreshToken = utils.uid(256),
                        accessExpires = Date.now() + 3600 * 1000,
                        refreshExpires = Date.now() + 3600 * 24 * 1000;

                    return models.Accesstoken.add({token: accessToken, user_id: user.id, client_id: client.id, expires: accessExpires}).then(function () {
                        return models.Refreshtoken.add({token: refreshToken, user_id: user.id, client_id: client.id, expires: refreshExpires});
                    }).then(function () {
                        return done(null, accessToken, refreshToken, {expires_in: 3600});
                    }).catch(function () {
                        return done(null, false);
                    });
                }).catch(function () {
                    return done(null, false);
                });
            });
        }));

        // Exchange the refresh token to obtain an access token.  The callback accepts the
        // `client`, which is exchanging a `refreshToken` previously issued by the server
        // for verification. If these values are validated, the application issues an 
        // access token on behalf of the user who authorized the code.
        oauthServer.exchange(oauth2orize.exchange.refreshToken(function (client, refreshToken, scope, done) {
            models.Refreshtoken.forge({token: refreshToken})
            .fetch()
            .then(function (model) {
                if (!model) {
                    return done(null, false);
                } else {
                    var token = model.toJSON(),
                        accessToken = utils.uid(256),
                        accessExpires = Date.now() + 3600 * 1000;

                    if (token.expires > Date.now()) {
                        models.Accesstoken.add({token: accessToken, user_id: token.user_id, client_id: token.client_id, expires: accessExpires}).then(function () {
                            return done(null, accessToken);
                        }).catch(function () {
                            return done(null, false);
                        });
                    } else {
                        done(null, false);
                    }
                }
            });
        }));
    }
};

module.exports = oauth;