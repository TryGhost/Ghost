// # API Utils
// Shared helpers for working with the API
var Promise = require('bluebird'),
    _       = require('lodash'),
    path    = require('path'),
    errors  = require('../errors'),
    permissions = require('../permissions'),
    validation  = require('../data/validation'),

    utils;

utils = {
    // ## Default Options
    // Various default options for different types of endpoints

    // ### Auto Default Options
    // Handled / Added automatically by the validate function
    // globalDefaultOptions - valid for every api endpoint
    globalDefaultOptions: ['context', 'include'],
    // dataDefaultOptions - valid for all endpoints which take object as well as options
    dataDefaultOptions: ['data'],

    // ### Manual Default Options
    // These must be provided by the endpoint
    // browseDefaultOptions - valid for all browse api endpoints
    browseDefaultOptions: ['page', 'limit', 'fields'],
    // idDefaultOptions - valid whenever an id is valid
    idDefaultOptions: ['id'],

    /**
     * ## Validate
     * Prepare to validate the object and options passed to an endpoint
     * @param {String} docName
     * @param {Object} extras
     * @returns {Function} doValidate
     */
    validate: function validate(docName, extras) {
        /**
         * ### Do Validate
         * Validate the object and options passed to an endpoint
         * @argument object
         * @argument options
         */
        return function doValidate() {
            var object, options, permittedOptions;
            if (arguments.length === 2) {
                object = arguments[0];
                options = _.clone(arguments[1]) || {};
            } else if (arguments.length === 1) {
                options = _.clone(arguments[0]) || {};
            } else {
                options = {};
            }

            // Setup permitted options, starting with the global defaults
            permittedOptions = utils.globalDefaultOptions;

            // Add extra permitted options if any are passed in
            if (extras && extras.opts) {
                permittedOptions = permittedOptions.concat(extras.opts);
            }

            // This request will have a data key added during validation
            if ((extras && extras.attrs) || object) {
                permittedOptions = permittedOptions.concat(utils.dataDefaultOptions);
            }

            // If an 'attrs' object is passed, we use this to pick from options and convert them to data
            if (extras && extras.attrs) {
                options.data = _.pick(options, extras.attrs);
                options = _.omit(options, extras.attrs);
            }

            /**
             * ### Check Options
             * Ensure that the options provided match exactly with what is permitted
             * - incorrect option keys are sanitized
             * - incorrect option values are validated
             * @param {object} options
             * @returns {Promise<options>}
             */
            function checkOptions(options) {
                // @TODO: should we throw an error if there are incorrect options provided?
                options = _.pick(options, permittedOptions);

                var validationErrors = utils.validateOptions(options);

                if (_.isEmpty(validationErrors)) {
                    return Promise.resolve(options);
                }

                return errors.logAndRejectError(validationErrors);
            }

            // If we got an object, check that too
            if (object) {
                return utils.checkObject(object, docName, options.id).then(function (data) {
                    options.data = data;

                    return checkOptions(options);
                });
            }

            // Otherwise just check options and return
            return checkOptions(options);
        };
    },

    validateOptions: function validateOptions(options) {
        var globalValidations = {
                id: {matches: /^\d+|me$/},
                uuid: {isUUID: true},
                page: {matches: /^\d+$/},
                limit: {matches: /^\d+|all$/},
                fields: {matches: /^[a-z0-9_,]+$/},
                name: {}
            },
            // these values are sanitised/validated separately
            noValidation = ['data', 'context', 'include'],
            errors = [];

        _.each(options, function (value, key) {
            // data is validated elsewhere
            if (noValidation.indexOf(key) === -1) {
                if (globalValidations[key]) {
                    errors = errors.concat(validation.validate(value, key, globalValidations[key]));
                } else {
                    // all other keys should be an alphanumeric string + -, like slug, tag, author, status, etc
                    errors = errors.concat(validation.validate(value, key, {matches: /^[a-z0-9\-]+$/}));
                }
            }
        });

        return errors;
    },

    /**
     * ## Is Public Context?
     * If this is a public context, return true
     * @param {Object} options
     * @returns {Boolean}
     */
    isPublicContext: function isPublicContext(options) {
        return permissions.parseContext(options.context).public;
    },
    /**
     * ## Apply Public Permissions
     * Update the options object so that the rules reflect what is permitted to be retrieved from a public request
     * @param {String} docName
     * @param {String} method (read || browse)
     * @param {Object} options
     * @returns {Object} options
     */
    applyPublicPermissions: function applyPublicPermissions(docName, method, options) {
        return permissions.applyPublicRules(docName, method, options);
    },

    /**
     * ## Handle Public Permissions
     * @param {String} docName
     * @param {String} method (read || browse)
     * @returns {Function}
     */
    handlePublicPermissions: function handlePublicPermissions(docName, method) {
        var singular = docName.replace(/s$/, '');

        /**
         * Check if this is a public request, if so use the public permissions, otherwise use standard canThis
         * @param {Object} options
         * @returns {Object} options
         */
        return function doHandlePublicPermissions(options) {
            var permsPromise;

            if (utils.isPublicContext(options)) {
                permsPromise = utils.applyPublicPermissions(docName, method, options);
            } else {
                permsPromise = permissions.canThis(options.context)[method][singular](options.data);
            }

            return permsPromise.then(function permissionGranted() {
                return options;
            }).catch(function handleError(error) {
                return errors.handleAPIError(error);
            });
        };
    },

    /**
     * ## Handle Permissions
     * @param {String} docName
     * @param {String} method (browse || read || edit || add || destroy)
     * @returns {Function}
     */
    handlePermissions: function handlePermissions(docName, method) {
        var singular = docName.replace(/s$/, '');

        /**
         * ### Handle Permissions
         * We need to be an authorised user to perform this action
         * @param {Object} options
         * @returns {Object} options
         */
        return function doHandlePermissions(options) {
            var permsPromise = permissions.canThis(options.context)[method][singular](options.id);

            return permsPromise.then(function permissionGranted() {
                return options;
            }).catch(errors.NoPermissionError, function handleNoPermissionError(error) {
                // pimp error message
                error.message = 'You do not have permission to ' + method + ' ' + docName;
                // forward error to next catch()
                return Promise.reject(error);
            }).catch(function handleError(error) {
                return errors.handleAPIError(error);
            });
        };
    },

    prepareInclude: function prepareInclude(include, allowedIncludes) {
        include = include || '';
        include = _.intersection(include.split(','), allowedIncludes);

        return include;
    },

    prepareFields: function prepareFields(fields) {
        fields = fields || '';
        if (_.isString(fields)) {
            fields = fields.split(',');
        }

        return fields;
    },

    /**
     * ## Convert Options
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
            if (options.fields) {
                options.columns = utils.prepareFields(options.fields);
                delete options.fields;
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
