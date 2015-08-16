var BearerStrategy          = require('passport-http-bearer').Strategy,
    ClientPasswordStrategy  = require('passport-oauth2-client-password').Strategy,
    models                  = require('../models'),
    strategies;

strategies = {

    /**
     * ClientPasswordStrategy
     *
     * This strategy is used to authenticate registered OAuth clients.  It is
     * employed to protect the `token` endpoint, which consumers use to obtain
     * access tokens.  The OAuth 2.0 specification suggests that clients use the
     * HTTP Basic scheme to authenticate (not implemented yet).
     * Use of the client password strategy is implemented to support ember-simple-auth.
     */
    clientPasswordStrategy: new ClientPasswordStrategy(
        function strategy(clientId, clientSecret, done) {
            models.Client.forge({slug: clientId})
            .fetch()
            .then(function then(model) {
                if (model) {
                    var client = model.toJSON();
                    if (client.secret === clientSecret) {
                        return done(null, client);
                    }
                }
                return done(null, false);
            });
        }
    ),

    /**
     * BearerStrategy
     *
     * This strategy is used to authenticate users based on an access token (aka a
     * bearer token).  The user must have previously authorized a client
     * application, which is issued an access token to make requests on behalf of
     * the authorizing user.
     */
    bearerStrategy: new BearerStrategy(
        function strategy(accessToken, done) {
            models.Accesstoken.forge({token: accessToken})
            .fetch()
            .then(function then(model) {
                if (model) {
                    var token = model.toJSON();
                    if (token.expires > Date.now()) {
                        models.User.forge({id: token.user_id})
                        .fetch()
                        .then(function then(model) {
                            if (model) {
                                var user = model.toJSON(),
                                    info = {scope: '*'};
                                return done(null, {id: user.id}, info);
                            }
                            return done(null, false);
                        });
                    } else {
                        return done(null, false);
                    }
                } else {
                    return done(null, false);
                }
            });
        }
    )
};

module.exports = strategies;
