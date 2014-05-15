var when    = require('when'),
    _       = require('lodash'),
    errors  = require('../errors'),
    utils;

utils = {
    checkObject: function (object, docName) {
        if (_.isEmpty(object) || !object.hasOwnProperty(docName) || !_.isArray(object[docName])) {
            return when.reject(new errors.BadRequestError('No root key (\'' + docName + '\') provided.'));
        }
        return when.resolve(object);
    }
};

module.exports = utils;