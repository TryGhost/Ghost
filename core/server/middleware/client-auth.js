var passport    = require('passport'),
    oauthServer,

    clientAuth;

function cacheOauthServer(server) {
    oauthServer = server;
}

clientAuth = {
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
