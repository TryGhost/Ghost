// # Configuration API
// RESTful API for browsing the configuration
var _                  = require('lodash'),
    config             = require('../config'),
    errors             = require('../errors'),
    Promise            = require('bluebird'),

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
        return Promise.resolve({configuration: _.map(getValidKeys(), function (value, key) {
            return {
                key: key,
                value: value
            };
        })});
    },

    /**
     * ### Read
     *
     */
    read: function read(options) {
        var data = getValidKeys();

        if (_.has(data, options.key)) {
            return Promise.resolve({configuration: [{
                key: options.key,
                value: data[options.key]
            }]});
        } else {
            return Promise.reject(new errors.NotFoundError('Invalid key'));
        }
    }
};

module.exports = configuration;
