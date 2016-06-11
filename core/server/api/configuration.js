// # Configuration API
// RESTful API for browsing the configuration
var _                  = require('lodash'),
    config             = require('../config'),
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
        version: config.ghostVersion,
        environment: process.env.NODE_ENV,
        database: config.database.client,
        mail: _.isObject(config.mail) ? config.mail.transport : ''
    };
}

function getBaseConfig() {
    return {
        fileStorage:    {value: (config.fileStorage !== false), type: 'bool'},
        useGoogleFonts: {value: !config.isPrivacyDisabled('useGoogleFonts'), type: 'bool'},
        useGravatar:    {value: !config.isPrivacyDisabled('useGravatar'), type: 'bool'},
        publicAPI:      labsFlag('publicAPI'),
        internalTags:   labsFlag('internalTags'),
        blogUrl:        {value: config.url.replace(/\/$/, ''), type: 'string'},
        blogTitle:      {value: config.theme.title, type: 'string'},
        routeKeywords:  {value: JSON.stringify(config.routeKeywords), type: 'json'}
    };
}

/**
 * ## Configuration API Methods
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
            return Promise.resolve({configuration: [getBaseConfig()]});
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
