// # Configuration API
// RESTful API for browsing the configuration
var _                  = require('lodash'),
    config             = require('../config'),
    errors             = require('../errors'),
    parsePackageJson   = require('../require-tree').parsePackageJson,
    Promise            = require('bluebird'),

    configuration;

function getValidKeys() {
    var validKeys = {
            fileStorage: config.fileStorage === false ? false : true,
            apps: config.apps === true ? true : false,
            version: false,
            environment: process.env.NODE_ENV,
            database: config.database.client,
            mail: _.isObject(config.mail) ? config.mail.transport : '',
            blogUrl: config.url
        };

    return parsePackageJson('package.json').then(function (json) {
        validKeys.version = json.version;
        return validKeys;
    });
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
        return getValidKeys().then(function (result) {
            return Promise.resolve({configuration: _.map(result, function (value, key) {
                return {
                    key: key,
                    value: value
                };
            })});
        });
    },

    /**
     * ### Read
     *
     */
    read: function read(options) {
        return getValidKeys().then(function (result) {
            if (_.has(result, options.key)) {
                return Promise.resolve({configuration: [{
                    key: options.key,
                    value: result[options.key]
                }]});
            } else {
                return Promise.reject(new errors.NotFoundError('Invalid key'));
            }
        });
    }
};

module.exports = configuration;
