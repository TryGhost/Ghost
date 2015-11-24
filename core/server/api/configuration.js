// # Configuration API
// RESTful API for browsing the configuration
var _                  = require('lodash'),
    config             = require('../config'),
    errors             = require('../errors'),
    Promise            = require('bluebird'),
    utils              = require('./utils'),
    pipeline           = require('../utils/pipeline'),

    configuration;

function getValidKeys() {
    var validKeys = {
            fileStorage: config.fileStorage === false ? false : true,
            publicAPI: config.publicAPI === true ? true : false,
            apps: config.apps === true ? true : false,
            version: config.ghostVersion,
            environment: process.env.NODE_ENV,
            database: config.database.client,
            mail: _.isObject(config.mail) ? config.mail.transport : '',
            blogUrl: config.url.replace(/\/$/, ''),
            blogTitle: config.theme.title,
            routeKeywords: JSON.stringify(config.routeKeywords)
        };

    return validKeys;
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
        function formatResponse(keys) {
            return {configuration: _.map(keys, function (value, key) {
                return {
                    key: key,
                    value: value
                };
            })};
        }

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline([getValidKeys, formatResponse]);
    },

    /**
     * ### Read
     * Fetch a single configuration by key
     * @param {{key}} options
     * @returns {Promise<Configuration>} Configuration
     */
    read: function read(options) {
        var tasks,
            attrs = ['key'];

        function fetchData(options) {
            options.config = getValidKeys();
            return options;
        }

        function validateOptions(options) {
            if (_.has(options.config, options.data.key)) {
                return options;
            } else {
                return Promise.reject(new errors.NotFoundError('Invalid key'));
            }
        }

        function formatResponse(options) {
            return {configuration: [{
                key: options.data.key,
                value: options.config[options.data.key]
            }]};
        }

        tasks = [
            utils.validate('configuration', {attrs: attrs}),
            fetchData,
            validateOptions,
            formatResponse
        ];

        return pipeline(tasks, options);
    }
};

module.exports = configuration;
