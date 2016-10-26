// # Configuration API
// RESTful API for browsing the configuration
var _                  = require('lodash'),
    config             = require('../config'),
    ghostVersion       = require('../utils/ghost-version'),
    models             = require('../models'),
    Promise            = require('bluebird'),

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
        fileStorage:    config.get('fileStorage') !== false,
        useGravatar:    !config.isPrivacyDisabled('useGravatar'),
        publicAPI:      config.get('publicAPI') === true,
        blogUrl:        config.get('url').replace(/\/$/, ''),
        blogTitle:      config.get('theme').title,
        routeKeywords:  JSON.stringify(config.get('routeKeywords'))
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

                    if (result.ghostAuth) {
                        configuration.ghostAuthId = result.ghostAuth.get('uuid');
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

        return Promise.resolve({configuration: []});
    }
};

module.exports = configuration;
