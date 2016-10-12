var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy,
    BearerStrategy = require('passport-http-bearer').Strategy,
    GhostOAuth2Strategy = require('passport-ghost').Strategy,
    passport = require('passport'),
    Promise = require('bluebird'),
    authStrategies = require('./auth-strategies'),
    utils = require('../utils'),
    errors = require('../errors'),
    logging = require('../logging'),
    models = require('../models'),
    _private = {
        retryTimeout: 3000,
        retries: 10
    };

_private.registerClient = function (options) {
    var ghostOAuth2Strategy = options.ghostOAuth2Strategy,
        url = options.url;

    return models.Client.findOne({slug: 'ghost-auth'}, {context: {internal: true}})
        .then(function fetchedClient(client) {
            // CASE: Ghost Auth client is already registered
            if (client) {
                return {
                    client_id: client.get('uuid'),
                    client_secret: client.get('secret')
                };
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
                    return {
                        client_id: client.get('uuid'),
                        client_secret: client.get('secret')
                    };
                });
        });
};

_private.startPublicClientRegistration = function startPublicClientRegistration(options) {
    return new Promise(function (resolve, reject) {
        (function retry(retries) {
            options.retryCount = retries;

            _private.registerClient(options)
                .then(resolve)
                .catch(function publicClientRegistrationError(err) {
                    logging.error(err);

                    if (options.retryCount < 0) {
                        return reject(new errors.IncorrectUsageError({
                            message: 'Public client registration failed:  ' + err.code || err.message,
                            context: 'Please verify that the url can be reached: ' + options.ghostOAuth2Strategy.url
                        }));
                    }

                    logging.debug('Trying to register Public Client...');
                    var timeout = setTimeout(function () {
                        clearTimeout(timeout);

                        options.retryCount = options.retryCount - 1;
                        retry(options.retryCount);
                    }, _private.retryTimeout);
                });
        })(_private.retries);
    });
};

/**
 * auth types:
 *   - password: local login
 *   - ghost: remote login at Ghost.org
 */
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

        _private.startPublicClientRegistration({
            ghostOAuth2Strategy: ghostOAuth2Strategy,
            url: utils.url.getBaseUrl()
        }).then(function setClient(client) {
            logging.debug('Public Client Registration was successful');

            ghostOAuth2Strategy.setClient(client);
            passport.use(ghostOAuth2Strategy);
            return resolve({passport: passport.initialize()});
        }).catch(reject);
    });
};
