// # Configuration API
// RESTful API for browsing the configuration
var _                  = require('lodash'),
    config             = require('../config'),
    errors             = require('../errors'),
    Promise            = require('bluebird'),
    i18n               = require('../i18n'),

    configuration;

function labsFlag(key) {
    return {
        value: (config[key] === true),
        type: 'bool'
    };
}

function getValidKeys() {
    var validKeys = {
            fileStorage: {value: (config.fileStorage !== false), type: 'bool'},
            publicAPI: labsFlag('publicAPI'),
            apps: {value: (config.apps === true), type: 'bool'},
            version: {value: config.ghostVersion, type: 'string'},
            environment: process.env.NODE_ENV,
            database: config.database.client,
            mail: _.isObject(config.mail) ? config.mail.transport : '',
            blogUrl: {value: config.url.replace(/\/$/, ''), type: 'string'},
            blogTitle: {value: config.theme.title, type: 'string'},
            routeKeywords: {value: JSON.stringify(config.routeKeywords), type: 'json'}
        };

    return validKeys;
}

function formatConfigurationObject(val, key) {
    return {
        key: key,
        value: (_.isObject(val) && _.has(val, 'value')) ? val.value : val,
        type: _.isObject(val) ? (val.type || null) : null
    };
}

/**
 * ## Configuration API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
configuration = {

    /**
     * ### Browse
     * Fetch all configuration keys
     * @returns {Promise(Configurations)}
     */
    browse: function browse() {
        return Promise.resolve({configuration: _.map(getValidKeys(), formatConfigurationObject)});
    },

    /**
     * ### Read
     *
     */
    read: function read(options) {
        var data = getValidKeys();

        if (_.has(data, options.key)) {
            return Promise.resolve({configuration: [formatConfigurationObject(data[options.key], options.key)]});
        } else {
            return Promise.reject(new errors.NotFoundError(i18n.t('errors.api.configuration.invalidKey')));
        }
    }
};

module.exports = configuration;
