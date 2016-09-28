var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy,
    BearerStrategy = require('passport-http-bearer').Strategy,
    GhostOAuth2Strategy = require('passport-ghost').Strategy,
    passport = require('passport'),
    Promise = require('bluebird'),
    authStrategies = require('./auth-strategies'),
    utils = require('../utils'),
    models = require('../models'),
    _private = {};

/**
 * Public client registration at Ghost.org
 */
_private.registerClient = function (options) {
    var ghostOAuth2Strategy = options.ghostOAuth2Strategy,
        url = options.url;

    return new Promise(function (resolve, reject) {
        var retry = function (retryCount, done) {
            models.Client.findOne({name: 'patronus'}, {context: {internal: true}})
                .then(function (client) {
                    // CASE: patronus client is already registered
                    if (client) {
                        return done(null, {
                            client_id: client.get('uuid'),
                            client_secret: client.get('secret')
                        });
                    }

                    return ghostOAuth2Strategy.registerClient({clientName: url})
                        .then(function (credentials) {
                            // @TODO: uuid usage
                            return models.Client.add({
                                name: 'patronus',
                                slug: 'patronus',
                                uuid: credentials.client_id,
                                secret: credentials.client_secret
                            }, {context: {internal: true}});
                        })
                        .then(function (client) {
                            return done(null, {
                                client_id: client.get('uuid'),
                                client_secret: client.get('secret')
                            });
                        })
                        .catch(function (err) {
                            if (retryCount < 0) {
                                return done(new Error('could not register client for patronus:' + err.code || err.message));
                            }

                            console.log('RETRY: Public Client Patronus Registration...');

                            var timeout = setTimeout(function () {
                                clearTimeout(timeout);
                                retryCount = retryCount - 1;
                                retry(retryCount, done);
                            }, 3000);
                        });
                })
                .catch(reject);
        };

        retry(10, function (err, client) {
            if (err) {
                return reject(err);
            }

            resolve(client);
        });
    });
};

exports.init = function (options) {
    var type = options.type,
        url = options.url;

    return new Promise(function (resolve, reject) {
        passport.use(new ClientPasswordStrategy(authStrategies.clientPasswordStrategy));
        passport.use(new BearerStrategy(authStrategies.bearerStrategy));

        if (type !== 'patronus') {
            return resolve({passport: passport.initialize()});
        }

        var ghostOAuth2Strategy = new GhostOAuth2Strategy({
            callbackURL: utils.url.getBaseUrl() + '/ghost/',
            url: url,
            passReqToCallback: true
        }, authStrategies.ghostStrategy);

        _private.registerClient({ghostOAuth2Strategy: ghostOAuth2Strategy, url: utils.url.getBaseUrl()})
            .then(function (client) {
                console.log('SUCCESS: Public Client Patronus Registration');
                ghostOAuth2Strategy.setClient(client);
                passport.use(ghostOAuth2Strategy);
                return resolve({passport: passport.initialize()});
            })
            .catch(reject);
    });
};
