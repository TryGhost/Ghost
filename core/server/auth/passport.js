var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy,
    BearerStrategy = require('passport-http-bearer').Strategy,
    GhostOAuth2Strategy = require('passport-ghost').Strategy,
    passport = require('passport'),
    Promise = require('bluebird'),
    authStrategies = require('./auth-strategies'),
    utils = require('../utils'),
    errors = require('../errors'),
    models = require('../models'),
    _private = {};

/**
 * Public client registration at Ghost.org
 */
_private.registerClient = function registerClient(options) {
    var ghostOAuth2Strategy = options.ghostOAuth2Strategy,
        url = options.url;

    return new Promise(function (resolve, reject) {
        var retry = function retry(retryCount, done) {
            models.Client.findOne({slug: 'ghost-auth'}, {context: {internal: true}})
                .then(function (client) {
                    // CASE: Ghost Auth client is already registered
                    if (client) {
                        return done(null, {
                            client_id: client.get('uuid'),
                            client_secret: client.get('secret')
                        });
                    }

                    return ghostOAuth2Strategy.registerClient({clientName: url})
                        .then(function addClient(credentials) {
                            return models.Client.add({
                                name: 'Ghost Auth',
                                slug: 'ghost-auth',
                                uuid: credentials.client_id,
                                secret: credentials.client_secret
                            }, {context: {internal: true}});
                        })
                        .then(function returnClient(client) {
                            return done(null, {
                                client_id: client.get('uuid'),
                                client_secret: client.get('secret')
                            });
                        })
                        .catch(function publicClientRegistrationError(err) {
                            if (retryCount < 0) {
                                return done(new errors.IncorrectUsage(
                                    'Public client registration failed:  ' + err.code || err.message,
                                    'Please verify that the url is reachable: ' + ghostOAuth2Strategy.url
                                ));
                            }

                            console.log('RETRY: Public Client Registration...');
                            var timeout = setTimeout(function () {
                                clearTimeout(timeout);
                                retryCount = retryCount - 1;
                                retry(retryCount, done);
                            }, 3000);
                        });
                })
                .catch(reject);
        };

        retry(10, function retryPublicClientRegistration(err, client) {
            if (err) {
                return reject(err);
            }

            resolve(client);
        });
    });
};

exports.init = function initPassport(options) {
    var type = options.type,
        url = options.url;

    return new Promise(function (resolve, reject) {
        passport.use(new ClientPasswordStrategy(authStrategies.clientPasswordStrategy));
        passport.use(new BearerStrategy(authStrategies.bearerStrategy));

        if (type !== 'ghost') {
            return resolve({passport: passport.initialize()});
        }

        var ghostOAuth2Strategy = new GhostOAuth2Strategy({
            callbackURL: utils.url.getBaseUrl() + '/ghost/',
            url: url,
            passReqToCallback: true
        }, authStrategies.ghostStrategy);

        _private.registerClient({ghostOAuth2Strategy: ghostOAuth2Strategy, url: utils.url.getBaseUrl()})
            .then(function setClient(client) {
                console.log('SUCCESS: Public Client Registration');

                ghostOAuth2Strategy.setClient(client);
                passport.use(ghostOAuth2Strategy);
                return resolve({passport: passport.initialize()});
            })
            .catch(reject);
    });
};
