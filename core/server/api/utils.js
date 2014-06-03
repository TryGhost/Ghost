// # API Utils
// Shared helpers for working with the API
var when    = require('when'),
    _       = require('lodash'),
    utils;

utils = {
    /**
     * ### Check Object
     * Check an object passed to the API is in the correct format
     *
     * @param {Object} object
     * @param {String} docName
     * @returns {Promise(Object)} resolves to the original object if it checks out
     */
    checkObject: function (object, docName) {
        if (_.isEmpty(object) || _.isEmpty(object[docName]) || _.isEmpty(object[docName][0])) {
            return when.reject({type: 'BadRequest', message: 'No root key (\'' + docName + '\') provided.'});
        }
        return when.resolve(object);
    }
};

module.exports = utils;