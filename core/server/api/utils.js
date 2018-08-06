// # API Utils
// Shared helpers for working with the API
var Promise = require('bluebird'),
    _ = require('lodash'),
    permissions = require('../services/permissions'),
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
     * @param {Array} unsafeAttrNames - attribute names (e.g. post.status) that could change the outcome
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

            return permsPromise.then(function permissionGranted(result) {
                /*
                 * Allow the permissions function to return a list of excluded attributes.
                 * If it does, omit those attrs from the data passed through
                 *
                 * NOTE: excludedAttrs differ from unsafeAttrs in that they're determined by the model's permissible function,
                 * and the attributes are simply excluded rather than throwing a NoPermission exception
                 *
                 * TODO: This is currently only needed because of the posts model and the contributor role. Once we extend the
                 * contributor role to be able to edit existing tags, this concept can be removed.
                 */
                if (result && result.excludedAttrs && _.has(options, 'data.[' + docName + '][0]')) {
                    options.data[docName][0] = _.omit(options.data[docName][0], result.excludedAttrs);
                }

                return options;
            }).catch(function handleNoPermissionError(err) {
                if (err instanceof common.errors.NoPermissionError) {
                    err.message = common.i18n.t('errors.api.utils.noPermissionToCall', {
                        method: method,
                        docName: docName
                    });
                    return Promise.reject(err);
                }

                if (common.errors.utils.isIgnitionError(err)) {
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
    convertOptions: function convertOptions(allowedIncludes, allowedFormats, convertOptions = {forModel: true}) {
        /**
         * Convert our options from API-style to Model-style (default)
         * @param {Object} options
         * @returns {Object} options
         */
        return function doConversion(options) {
            if (options.include) {
                if (!convertOptions.forModel) {
                    options.include = utils.prepareInclude(options.include, allowedIncludes);
                } else {
                    options.withRelated = utils.prepareInclude(options.include, allowedIncludes);
                    delete options.include;
                }
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
     * @TODO:
     * The weird thing about this function is..
     *   - that the API converts properties back to model notation
     *      - post.author -> post.author_id
     *   - and the model layer implementation of `toJSON` knows about these transformations as well
     *      - post.author_id -> post.author
     *   - this must live in one place
     *      - API IN <-> API OUT
     *      - this should be unrelated to the model layer
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

        if (docName === 'posts') {
            /**
             * Convert author property to author_id to match the name in the database.
             *
             * @deprecated: `author`, will be removed in Ghost 3.0
             */
            if (object.posts[0].hasOwnProperty('author')) {
                object.posts[0].author_id = object.posts[0].author;
                delete object.posts[0].author;
            }

            /**
             * Ensure correct incoming `post.authors` structure.
             *
             * NOTE:
             * The `post.authors[*].id` attribute is required till we release Ghost 3.0.
             * Ghost 1.x keeps the deprecated support for `post.author_id`, which is the primary author id and needs to be
             * updated if the order of the `post.authors` array changes.
             * If we allow adding authors via the post endpoint e.g. `authors=[{name: 'newuser']` (no id property), it's hard
             * to update the primary author id (`post.author_id`), because the new author `id` is generated when attaching
             * the author to the post. And the attach operation happens in bookshelf-relations, which happens after
             * the event handling in the post model.
             *
             * It's solvable, but not worth right now solving, because the admin UI does not support this feature.
             *
             * TLDR; You can only attach existing authors to a post.
             *
             * @TODO: remove `id` restriction in Ghost 3.0
             */
            if (object.posts[0].hasOwnProperty('authors')) {
                if (!_.isArray(object.posts[0].authors) ||
                    (object.posts[0].authors.length && _.filter(object.posts[0].authors, 'id').length !== object.posts[0].authors.length)) {
                    return Promise.reject(new common.errors.BadRequestError({
                        message: common.i18n.t('errors.api.utils.invalidStructure', {key: 'posts[*].authors'})
                    }));
                }

                /**
                 * CASE: we don't support updating nested-nested relations e.g. `post.authors[*].roles` yet.
                 *
                 * Bookshelf-relations supports this feature, BUT bookshelf's `hasChanged` fn will currently
                 * clash with this, because `hasChanged` won't be able to tell if relations have changed or not.
                 * It would always return `changed.roles = [....]`. It would always throw a model event that relations
                 * were updated, which is not true.
                 *
                 * Bookshelf-relations can tell us if a relation has changed, it knows that.
                 * But the connection between our model layer, Bookshelf's `hasChanged` fn and Bookshelf-relations
                 * is not present. As long as we don't support this case, we have to ignore this.
                 */
                if (object.posts[0].authors && object.posts[0].authors.length) {
                    _.each(object.posts[0].authors, (author, index) => {
                        if (author.hasOwnProperty('roles')) {
                            delete object.posts[0].authors[index].roles;
                        }

                        if (author.hasOwnProperty('permissions')) {
                            delete object.posts[0].authors[index].permissions;
                        }
                    });
                }
            }

            /**
             * Model notation is: `tag.parent_id`.
             * The API notation is `tag.parent`.
             *
             * See @TODO on the fn description. This information lives in two places. Not nice.
             */
            if (object.posts[0].hasOwnProperty('tags')) {
                if (_.isArray(object.posts[0].tags) && object.posts[0].tags.length) {
                    _.each(object.posts[0].tags, (tag, index) => {
                        if (tag.hasOwnProperty('parent')) {
                            object.posts[0].tags[index].parent_id = tag.parent;
                            delete object.posts[0].tags[index].parent;
                        }

                        if (tag.hasOwnProperty('posts')) {
                            delete object.posts[0].tags[index].posts;
                        }
                    });
                }
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
    }
};

module.exports = utils;
