// # Configuration API
// RESTful API for browsing the configuration
var Promise = require('bluebird'),
    _ = require('lodash'),
    apiUtils = require('../utils'),
    models = require('../models'),
    config = require('../config'),
    settingsCache = require('../settings/cache'),
    ghostVersion = require('../utils/ghost-version'),
    configuration;

function fetchAvailableTimezones() {
    var timezones = require('../data/timezones.json');
    return timezones;
}

function fetchPrivateConfig() {
    var unsplashConfig = config.get('unsplash') || {};

    return {
        unsplashAPI: unsplashConfig
    };
}

function getAboutConfig() {
    return {
        version: ghostVersion.full,
        environment: config.get('env'),
        database: config.get('database').client,
        mail: _.isObject(config.get('mail')) ? config.get('mail').transport : ''
    };
}

function getBaseConfig() {
    return {
        useGravatar:    !config.isPrivacyDisabled('useGravatar'),
        publicAPI:      config.get('publicAPI') === true,
        blogUrl:        apiUtils.url.urlFor('home', true),
        blogTitle:      settingsCache.get('title'),
        routeKeywords:  config.get('routeKeywords'),
        clientExtensions: config.get('clientExtensions')
    };
}

/**
 * ## Configuration API Methods
 *
 * We need to load the client credentials dynamically.
 * For example: on bootstrap ghost-auth get's created and if we load them here in parallel,
 * it can happen that we won't get any client credentials or wrong credentials.
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
configuration = {

    /**
     * Always returns {configuration: []}
     * Sometimes the array contains configuration items
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    read: function read(options) {
        options = options || {};
        var ops = {};

        if (!options.key) {
            ops.ghostAdmin = models.Client.findOne({slug: 'ghost-admin'});

            if (config.get('auth:type') === 'ghost') {
                ops.ghostAuth = models.Client.findOne({slug: 'ghost-auth'});
            }

            return Promise.props(ops)
                .then(function (result) {
                    var configuration = getBaseConfig();

                    configuration.clientId = result.ghostAdmin.get('slug');
                    configuration.clientSecret = result.ghostAdmin.get('secret');

                    if (config.get('auth:type') === 'ghost') {
                        configuration.ghostAuthId = result.ghostAuth && result.ghostAuth.get('uuid') || 'not-available';
                        configuration.ghostAuthUrl = config.get('auth:url');
                    }

                    return {configuration: [configuration]};
                });
        }

        if (options.key === 'about') {
            return Promise.resolve({configuration: [getAboutConfig()]});
        }

        // Timezone endpoint
        if (options.key === 'timezones') {
            return Promise.resolve({configuration: [fetchAvailableTimezones()]});
        }

        // Private configuration config for API keys used by the client
        if (options.key === 'private') {
            return Promise.resolve({configuration: [fetchPrivateConfig()]});
        }

        return Promise.resolve({configuration: []});
    }
};

module.exports = configuration;
