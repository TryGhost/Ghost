// # API Utils
// Shared helpers for working with the API
var Promise = require('bluebird'),
    _       = require('lodash'),
    path    = require('path'),
    errors  = require('../errors'),
    utils;

utils = {
    validate: function validate(docName, attrs) {
        return function doValidate() {
            var object, options;
            if (arguments.length === 2) {
                object = arguments[0];
                options = _.clone(arguments[1]) || {};
            } else if (arguments.length === 1) {
                options = _.clone(arguments[0]) || {};
            } else {
                options = {};
            }

            if (attrs) {
                options.data = _.pick(options, attrs);
                options = _.omit(options, attrs);
            }

            if (object) {
                return utils.checkObject(object, docName, options.id).then(function (data) {
                    options.data = data;
                    return Promise.resolve(options);
                });
            }

            return Promise.resolve(options);
        };
    },

    prepareInclude: function prepareInclude(include, allowedIncludes) {
        include = include || '';
        include = _.intersection(include.split(','), allowedIncludes);

        return include;
    },
    /**
     * @param {Array} allowedIncludes
     * @returns {Function} doConversion
     */
    convertOptions: function convertOptions(allowedIncludes) {
        /**
         * Convert our options from API-style to Model-style
         * @param {Object} options
         * @returns {Object} options
         */
        return function doConversion(options) {
            if (options.include) {
                options.include = utils.prepareInclude(options.include, allowedIncludes);
            }
            return options;
        };
    },
    /**
     * ### Check Object
     * Check an object passed to the API is in the correct format
     *
     * @param {Object} object
     * @param {String} docName
     * @returns {Promise(Object)} resolves to the original object if it checks out
     */
    checkObject: function (object, docName, editId) {
        if (_.isEmpty(object) || _.isEmpty(object[docName]) || _.isEmpty(object[docName][0])) {
            return errors.logAndRejectError(new errors.BadRequestError('No root key (\'' + docName + '\') provided.'));
        }

        // convert author property to author_id to match the name in the database
        if (docName === 'posts') {
            if (object.posts[0].hasOwnProperty('author')) {
                object.posts[0].author_id = object.posts[0].author;
                delete object.posts[0].author;
            }
        }

        if (editId && object[docName][0].id && parseInt(editId, 10) !== parseInt(object[docName][0].id, 10)) {
            return errors.logAndRejectError(new errors.BadRequestError('Invalid id provided.'));
        }

        return Promise.resolve(object);
    },
    checkFileExists: function (options, filename) {
        return !!(options[filename] && options[filename].type && options[filename].path);
    },
    checkFileIsValid: function (file, types, extensions) {
        var type = file.type,
            ext = path.extname(file.name).toLowerCase();

        if (_.contains(types, type) && _.contains(extensions, ext)) {
            return true;
        }
        return false;
    }
};

module.exports = utils;
