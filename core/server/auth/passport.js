var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy,
    BearerStrategy = require('passport-http-bearer').Strategy,
    GhostOAuth2Strategy = require('passport-ghost').Strategy,
    passport = require('passport'),
    _ = require('lodash'),
    debug = require('ghost-ignition').debug('auth'),
    Promise = require('bluebird'),
    authStrategies = require('./auth-strategies'),
    errors = require('../errors'),
    events = require('../events'),
    logging = require('../logging'),
    models = require('../models'),
    _private = {};

/**
 * Update client name and description if changes in the blog settings
 */
_private.registerEvents = function registerEvents() {
    events.on('settings.edited', function onSettingsChanged(settingModel) {
        var titleHasChanged = settingModel.attributes.key === 'title' && settingModel.attributes.value !== settingModel._updatedAttributes.value,
            descriptionHasChanged = settingModel.attributes.key === 'description' && settingModel.attributes.value !== settingModel._updatedAttributes.value,
            options = {
                ghostOAuth2Strategy: passport._strategies.ghost
            };

        if (!titleHasChanged && !descriptionHasChanged) {
            return;
        }

        if (titleHasChanged) {
            options.clientName = settingModel.attributes.value;
            debug('Ghost Auth Client title has changed: ' + options.clientName);
        }

        if (descriptionHasChanged) {
            options.clientDescription = settingModel.attributes.value;
            debug('Ghost AuthClient description has changed: ' + options.clientDescription);
        }

        _private.updateClient(options).catch(function onUpdatedClientError(err) {
            // @TODO: see https://github.com/TryGhost/Ghost/issues/7627
            if (_.isArray(err)) {
                err = err[0];
            }

            logging.error(err);
        });
    });
};

/**
 * smart function
 */
_private.updateClient = function updateClient(options) {
    var ghostOAuth2Strategy = options.ghostOAuth2Strategy,
        redirectUri = options.redirectUri,
        clientUri = options.clientUri,
        clientName = options.clientName,
        clientDescription = options.clientDescription;

    return models.Client.findOne({slug: 'ghost-auth'}, {context: {internal: true}})
        .then(function (client) {
            // CASE: we have to create the client
            if (!client) {
                debug('Client does not exist');

                return ghostOAuth2Strategy.registerClient({
                    name: clientName,
                    description: clientDescription
                }).then(function registeredRemoteClient(credentials) {
                    debug('Registered remote client: ' + JSON.stringify(credentials));
                    logging.info('Registered remote client successfully.');

                    return models.Client.add({
                        name: credentials.name,
                        description: credentials.description,
                        slug: 'ghost-auth',
                        uuid: credentials.client_id,
                        secret: credentials.client_secret,
                        redirection_uri: credentials.redirect_uri,
                        client_uri: credentials.blog_uri,
                        auth_uri: ghostOAuth2Strategy.url
                    }, {context: {internal: true}});
                }).then(function addedLocalClient(client) {
                    debug('Added local client: ' + JSON.stringify(client.toJSON()));

                    return {
                        client_id: client.get('uuid'),
                        client_secret: client.get('secret')
                    };
                });
            }

            // CASE: auth url has changed, create client
            if (client.get('auth_uri') !== ghostOAuth2Strategy.url) {
                return models.Client.destroy({id: client.id})
                    .then(function () {
                        return _private.updateClient(options);
                    });
            }

            // CASE: nothing changed
            if (client.get('redirection_uri') === redirectUri &&
                client.get('name') === clientName &&
                client.get('description') === clientDescription &&
                client.get('client_uri') === clientUri) {
                debug('Client did not change');

                return {
                    client_id: client.get('uuid'),
                    client_secret: client.get('secret')
                };
            }

            debug('Update client...');
            return ghostOAuth2Strategy.updateClient(_.omit({
                clientId: client.get('uuid'),
                clientSecret: client.get('secret'),
                redirectUri: redirectUri,
                blogUri: clientUri,
                name: clientName,
                description: clientDescription
            }, _.isUndefined)).then(function updatedRemoteClient(updatedRemoteClient) {
                debug('Update remote client: ' + JSON.stringify(updatedRemoteClient));

                client.set('auth_uri', ghostOAuth2Strategy.url);
                client.set('redirection_uri', updatedRemoteClient.redirect_uri);
                client.set('client_uri', updatedRemoteClient.blog_uri);
                client.set('name', updatedRemoteClient.name);
                client.set('description', updatedRemoteClient.description);

                return client.save(null, {context: {internal: true}});
            }).then(function updatedLocalClient() {
                logging.info('Updated remote client successfully.');

                return {
                    client_id: client.get('uuid'),
                    client_secret: client.get('secret')
                };
            });
        });
};

/**
 * auth types:
 *   - password: local login
 *   - ghost: remote login at Ghost.org
 */
exports.init = function initPassport(options) {
    var authType = options.authType,
        clientName = options.clientName,
        clientDescription = options.clientDescription,
        ghostAuthUrl = options.ghostAuthUrl,
        redirectUri = options.redirectUri,
        clientUri = options.clientUri;

    return new Promise(function (resolve, reject) {
        passport.use(new ClientPasswordStrategy(authStrategies.clientPasswordStrategy));
        passport.use(new BearerStrategy(authStrategies.bearerStrategy));

        // CASE: use switches from password to ghost and back
        // If we don't clean up the database, it can happen that the auth switch validation fails
        if (authType !== 'ghost') {
            return models.Client.findOne({slug: 'ghost-auth'})
                .then(function (client) {
                    if (!client) {
                        return;
                    }

                    return models.Client.destroy({id: client.id});
                })
                .then(function () {
                    resolve({passport: passport.initialize()});
                })
                .catch(reject);
        }

        var ghostOAuth2Strategy = new GhostOAuth2Strategy({
            redirectUri: redirectUri,
            blogUri: clientUri,
            url: ghostAuthUrl,
            passReqToCallback: true,
            retryHook: function retryHook(err) {
                logging.error(err);
            }
        }, authStrategies.ghostStrategy);

        _private.updateClient({
            ghostOAuth2Strategy: ghostOAuth2Strategy,
            clientName: clientName,
            clientDescription: clientDescription,
            redirectUri: redirectUri,
            clientUri: clientUri
        }).then(function setClient(client) {
            ghostOAuth2Strategy.setClient(client);
            passport.use(ghostOAuth2Strategy);
            _private.registerEvents();
            return resolve({passport: passport.initialize()});
        }).catch(function onError(err) {
            debug('Public registration failed:' + err.message);

            // @TODO: see https://github.com/TryGhost/Ghost/issues/7627
            // CASE: can happen if database query fails
            if (_.isArray(err)) {
                err = err[0];
            }

            if (!errors.utils.isIgnitionError(err)) {
                err = new errors.GhostError({
                    err: err
                });
            }

            err.level = 'critical';
            err.context = err.context || 'Public client registration failed';
            err.help = err.help || 'Please verify the configured url: ' + ghostOAuth2Strategy.url;

            return reject(err);
        });
    });
};
