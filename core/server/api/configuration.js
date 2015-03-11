// # Configuration API
// RESTful API for browsing the configuration
var _                  = require('lodash'),
    config             = require('../config'),
    errors             = require('../errors'),
    Promise            = require('bluebird'),

    configuration;

function getValidKeys() {
    var mail = config.get('mail'),
        validKeys = {
            fileStorage: config.get('fileStorage') === false ? false : true,
            apps: config.get('apps') === true ? true : false,
            codeInjectionUI: config.get('codeInjectionUI') === true ? true : false,
            version: config.get('ghostVersion'),
            environment: config.get('NODE_ENV'),
            database: config.get('database:client'),
            mail: _.isObject(mail) ? mail.transport : '',
            blogUrl: config.get('url').replace(/\/$/, ''),
            blogTitle: config.get('theme:title')
        };

    mail = null;
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
