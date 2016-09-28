var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy,
    BearerStrategy = require('passport-http-bearer').Strategy,
    passport = require('passport'),
    Promise = require('bluebird'),
    authStrategies = require('./auth-strategies'),
    _private = {};

exports.init = function (options) {
    var type = options.type;

    return new Promise(function (resolve) {
        passport.use(new ClientPasswordStrategy(authStrategies.clientPasswordStrategy));
        passport.use(new BearerStrategy(authStrategies.bearerStrategy));

        if (type !== 'patronus') {
            return resolve({passport: passport.initialize()});
        }
    });
};
