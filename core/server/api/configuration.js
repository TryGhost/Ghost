// # Configuration API
// RESTful API for browsing the configuration
var _                  = require('lodash'),
    config             = require('../config'),
    ghostVersion       = require('../utils/ghost-version'),
    models             = require('../models'),
    Promise            = require('bluebird'),

    configuration;

function labsFlag(key) {
    return {
        value: (config[key] === true),
        type: 'bool'
    };
}

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
        fileStorage:    {value: (config.fileStorage !== false), type: 'bool'},
        useGravatar:    {value: !config.isPrivacyDisabled('useGravatar'), type: 'bool'},
        publicAPI:      labsFlag('publicAPI'),
        blogUrl:        {value: config.get('url').replace(/\/$/, ''), type: 'string'},
        blogTitle:      {value: config.get('theme').title, type: 'string'},
        routeKeywords:  {value: JSON.stringify(config.get('routeKeywords')), type: 'json'}
    };
}

/**
 * ## Configuration API Methods
 *
 * We need to load the client credentials dynamically.
 * For example: on bootstrap ghost-auth get's created and if we load them here in parallel,
 * it can happen that we won't get any client credentials or wrong credentials.
 *
 * @TODO: remove {value: .., type: ..} pattern?
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

                    configuration.clientId = {value: result.ghostAdmin.get('slug'), type: 'string'};
                    configuration.clientSecret = {value: result.ghostAdmin.get('secret'), type: 'string'};

                    if (result.ghostAuth) {
                        configuration.ghostAuthId = {value: result.ghostAuth.get('uuid'), type: 'string'};
                        configuration.ghostAuthUrl = {value: config.get('auth:url'), type: 'string'};
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
