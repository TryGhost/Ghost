var passport    = require('passport'),
    _           = require('lodash'),
    oauthServer,

    clientAuth;

function cacheOauthServer(server) {
    oauthServer = server;
}

clientAuth = {
    // work around to handle missing client_secret
    // oauth2orize needs it, but untrusted clients don't have it
    addClientSecret: function addClientSecret(req, res, next) {
        if (_.isEmpty(req.body.client_secret)) {
            req.body.client_secret = 'not_available';
        }
        next();
    },

    // ### Authenticate Client Middleware
    // authenticate client that is asking for an access token
    authenticateClient: function authenticateClient(req, res, next) {
        return passport.authenticate(['oauth2-client-password'], {session: false})(req, res, next);
    },

    // ### Generate access token Middleware
    // register the oauth2orize middleware for password and refresh token grants
    generateAccessToken: function generateAccessToken(req, res, next) {
        return oauthServer.token()(req, res, next);
    }
};

module.exports = clientAuth;
module.exports.cacheOauthServer = cacheOauthServer;
