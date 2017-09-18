var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy,
    BearerStrategy = require('passport-http-bearer').Strategy,
    passport = require('passport'),
    authStrategies = require('./auth-strategies');

/**
 * auth types:
 *   - password: local login
 */
exports.init = function initPassport() {
    passport.use(new ClientPasswordStrategy(authStrategies.clientPasswordStrategy));
    passport.use(new BearerStrategy(authStrategies.bearerStrategy));

    return passport.initialize();
};
