// # API Utils
// Shared helpers for working with the API
var Promise = require('bluebird'),
    _ = require('lodash'),
    path = require('path'),
    permissions = require('../permissions'),
    validation = require('../data/validation'),
    common = require('../lib/common'),
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
    browseDefaultOptions: ['page', 'limit', 'fields', 'filter', 'order', 'debug'],
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
         * @argument {...*} [arguments] object or object and options hash
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

                // For now, we can only handle showing the first validation error
                return Promise.reject(validationErrors[0]);
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
                id: {matches: /^[a-f\d]{24}$|^1$|me/i},
                uuid: {isUUID: true},
                slug: {isSlug: true},
                page: {matches: /^\d+$/},
                limit: {matches: /^\d+|all$/},
                from: {isDate: true},
                to: {isDate: true},
                fields: {matches: /^[\w, ]+$/},
                order: {matches: /^[a-z0-9_,\. ]+$/i},
                name: {},
                email: {isEmail: true}
            },
            // these values are sanitised/validated separately
            noValidation = ['data', 'context', 'include', 'filter', 'forUpdate', 'transacting', 'formats'],
            errors = [];

        _.each(options, function (value, key) {
            // data is validated elsewhere
            if (noValidation.indexOf(key) === -1) {
                if (globalValidations[key]) {
                    errors = errors.concat(validation.validate(value, key, globalValidations[key]));
                } else {
                    // all other keys should be alpha-numeric with dashes/underscores, like tag, author, status, etc
                    errors = errors.concat(validation.validate(value, key, globalValidations.slug));
                }
            }
        });

        return errors;
    },

    /**
     * ## Detect Public Context
     * Calls parse context to expand the options.context object
     * @param {Object} options
     * @returns {Boolean}
     */
    detectPublicContext: function detectPublicContext(options) {
        options.context = permissions.parseContext(options.context);
        return options.context.public;
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

            if (utils.detectPublicContext(options)) {
                permsPromise = utils.applyPublicPermissions(docName, method, options);
            } else {
                permsPromise = permissions.canThis(options.context)[method][singular](options.data);
            }

            return permsPromise.then(function permissionGranted() {
                return options;
            });
        };
    },

    /**
     * ## Handle Permissions
     * @param {String} docName
     * @param {String} method (browse || read || edit || add || destroy)
     * * @param {Array} unsafeAttrNames - attribute names (e.g. post.status) that could change the outcome
     * @returns {Function}
     */
    handlePermissions: function handlePermissions(docName, method, unsafeAttrNames) {
        var singular = docName.replace(/s$/, '');

        /**
         * ### Handle Permissions
         * We need to be an authorised user to perform this action
         * @param {Object} options
         * @returns {Object} options
         */
        return function doHandlePermissions(options) {
            var unsafeAttrObject = unsafeAttrNames && _.has(options, 'data.[' + docName + '][0]') ? _.pick(options.data[docName][0], unsafeAttrNames) : {},
                permsPromise = permissions.canThis(options.context)[method][singular](options.id, unsafeAttrObject);

            return permsPromise.then(function permissionGranted() {
                return options;
            }).catch(function handleNoPermissionError(err) {
                if (err instanceof common.errors.NoPermissionError) {
                    err.message = common.i18n.t('errors.api.utils.noPermissionToCall', {
                        method: method,
                        docName: docName
                    });
                    return Promise.reject(err);
                }

                return Promise.reject(new common.errors.GhostError({
                    err: err
                }));
            });
        };
    },

    trimAndLowerCase: function trimAndLowerCase(params) {
        params = params || '';
        if (_.isString(params)) {
            params = params.split(',');
        }

        return _.map(params, function (item) {
            return item.trim().toLowerCase();
        });
    },

    prepareInclude: function prepareInclude(include, allowedIncludes) {
        return _.intersection(this.trimAndLowerCase(include), allowedIncludes);
    },

    prepareFields: function prepareFields(fields) {
        return this.trimAndLowerCase(fields);
    },

    prepareFormats: function prepareFormats(formats, allowedFormats) {
        return _.intersection(this.trimAndLowerCase(formats), allowedFormats);
    },

    /**
     * ## Convert Options
     * @param {Array} allowedIncludes
     * @returns {Function} doConversion
     */
    convertOptions: function convertOptions(allowedIncludes, allowedFormats) {
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

            if (options.formats) {
                options.formats = utils.prepareFormats(options.formats, allowedFormats);
            }

            if (options.formats && options.columns) {
                options.columns = options.columns.concat(options.formats);
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
    checkObject: function checkObject(object, docName, editId) {
        if (_.isEmpty(object) || _.isEmpty(object[docName]) || _.isEmpty(object[docName][0])) {
            return Promise.reject(new common.errors.BadRequestError({
                message: common.i18n.t('errors.api.utils.noRootKeyProvided', {docName: docName})
            }));
        }

        // convert author property to author_id to match the name in the database
        if (docName === 'posts') {
            if (object.posts[0].hasOwnProperty('author')) {
                object.posts[0].author_id = object.posts[0].author;
                delete object.posts[0].author;
            }
        }

        // will remove unwanted null values
        _.each(object[docName], function (value, index) {
            if (!_.isObject(object[docName][index])) {
                return;
            }

            object[docName][index] = _.omitBy(object[docName][index], _.isNull);
        });

        if (editId && object[docName][0].id && editId !== object[docName][0].id) {
            return Promise.reject(new common.errors.BadRequestError({
                message: common.i18n.t('errors.api.utils.invalidIdProvided')
            }));
        }

        return Promise.resolve(object);
    },
    checkFileExists: function checkFileExists(fileData) {
        return !!(fileData.mimetype && fileData.path);
    },
    checkFileIsValid: function checkFileIsValid(fileData, types, extensions) {
        var type = fileData.mimetype,
            ext = path.extname(fileData.name).toLowerCase();

        if (_.includes(types, type) && _.includes(extensions, ext)) {
            return true;
        }
        return false;
    }
};

module.exports = utils;
