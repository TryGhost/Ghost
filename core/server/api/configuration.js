// # Configuration API
// RESTful API for browsing the configuration
var Promise = require('bluebird'),
    _ = require('lodash'),
    urlService = require('../services/url'),
    models = require('../models'),
    config = require('../config'),
    settingsCache = require('../settings/cache'),
    ghostVersion = require('../utils/ghost-version'),
    configuration;

function fetchAvailableTimezones() {
    var timezones = require('../data/timezones.json');
    return timezones;
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
        useGravatar: !config.isPrivacyDisabled('useGravatar'),
        publicAPI: config.get('publicAPI') === true,
        blogUrl: urlService.utils.urlFor('home', true),
        blogTitle: settingsCache.get('title'),
        routeKeywords: config.get('routeKeywords'),
        clientExtensions: config.get('clientExtensions')
    };
}

/**
 * ## Configuration API Methods
 *
 * We need to load the client credentials dynamically.
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

        if (!options.key) {
            return models.Client.findOne({slug: 'ghost-admin'})
                .then(function (ghostAdmin) {
                    var configuration = getBaseConfig();

                    configuration.clientId = ghostAdmin.get('slug');
                    configuration.clientSecret = ghostAdmin.get('secret');

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

        return Promise.resolve({configuration: []});
    }
};

module.exports = configuration;
