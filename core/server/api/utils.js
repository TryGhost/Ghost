var when    = require('when'),
    _       = require('lodash'),
    utils;

utils = {
    checkObject: function (object, docName) {
        if (_.isEmpty(object) || _.isEmpty(object[docName]) || _.isEmpty(object[docName][0])) {
            return when.reject({type: 'BadRequest', message: 'No root key (\'' + docName + '\') provided.'});
        }
        return when.resolve(object);
    }
};

module.exports = utils;