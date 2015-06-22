// # Tag API
// RESTful API for the Tag resource
var Promise      = require('bluebird'),
    _            = require('lodash'),
    canThis      = require('../permissions').canThis,
    dataProvider = require('../models'),
    errors       = require('../errors'),
    utils        = require('./utils'),
    pipeline        = require('../utils/pipeline'),

    docName      = 'tags',
    allowedIncludes = ['post_count'],
    tags;

/**
 * ### Tags API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
tags = {
    /**
     * ## Browse
     * @param {{context}} options
     * @returns {Promise<Tags>} Tags Collection
     */
    browse: function browse(options) {
        var tasks;

        /**
         * ### Handle Permissions
         * We need to be an authorised user to perform this action
         * @param {Object} options
         * @returns {Object} options
         */
        function handlePermissions(options) {
            return canThis(options.context).browse.tag().then(function permissionGranted() {
                return options;
            }).catch(function handleError(error) {
                return errors.handleAPIError(error, 'You do not have permission to browse tags.');
            });
        }

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return dataProvider.Tag.findPage(options);
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [utils.validate(docName), handlePermissions, utils.convertOptions(allowedIncludes), doQuery];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
    },

    /**
     * ## Read
     * @param {{id}} options
     * @return {Promise<Tag>} Tag
     */
    read: function read(options) {
        var attrs = ['id', 'slug'],
            tasks;

        /**
         * ### Handle Permissions
         * We need to be an authorised user to perform this action
         * @param {Object} options
         * @returns {Object} options
         */
        function handlePermissions(options) {
            return canThis(options.context).read.tag().then(function permissionGranted() {
                return options;
            }).catch(function handleError(error) {
                return errors.handleAPIError(error, 'You do not have permission to read tags.');
            });
        }

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return dataProvider.Tag.findOne(options.data, _.omit(options, ['data']));
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [utils.validate(docName, attrs), handlePermissions, utils.convertOptions(allowedIncludes), doQuery];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options).then(function formatResponse(result) {
            if (result) {
                return {tags: [result.toJSON(options)]};
            }

            return Promise.reject(new errors.NotFoundError('Tag not found.'));
        });
    },

    /**
     * ## Add
     * @param {Tag} object the tag to create
     * @returns {Promise(Tag)} Newly created Tag
     */
    add: function add(object, options) {
        var tasks;

        /**
         * ### Handle Permissions
         * We need to be an authorised user to perform this action
         * @param {Object} options
         * @returns {Object} options
         */
        function handlePermissions(options) {
            return canThis(options.context).add.tag(options.data).then(function permissionGranted() {
                return options;
            }).catch(function handleError(error) {
                return errors.handleAPIError(error, 'You do not have permission to add tags.');
            });
        }

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return dataProvider.Tag.add(options.data.tags[0], _.omit(options, ['data']));
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [utils.validate(docName), handlePermissions, utils.convertOptions(allowedIncludes), doQuery];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options).then(function formatResponse(result) {
            var tag = result.toJSON(options);

            return {tags: [tag]};
        });
    },

    /**
     * ## Edit
     *
     * @public
     * @param {Tag} object Tag or specific properties to update
     * @param {{id, context, include}} options
     * @return {Promise<Tag>} Edited Tag
     */
    edit: function edit(object, options) {
        var tasks;

        /**
         * ### Handle Permissions
         * We need to be an authorised user to perform this action
         * @param {Object} options
         * @returns {Object} options
         */
        function handlePermissions(options) {
            return canThis(options.context).edit.tag(options.id).then(function permissionGranted() {
                return options;
            }).catch(function handleError(error) {
                return errors.handleAPIError(error, 'You do not have permission to edit tags.');
            });
        }

        /**
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return dataProvider.Tag.edit(options.data.tags[0], _.omit(options, ['data']));
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [utils.validate(docName), handlePermissions, utils.convertOptions(allowedIncludes), doQuery];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options).then(function formatResponse(result) {
            if (result) {
                var tag = result.toJSON(options);

                return {tags: [tag]};
            }

            return Promise.reject(new errors.NotFoundError('Tag not found.'));
        });
    },

    /**
     * ## Destroy
     *
     * @public
     * @param {{id, context}} options
     * @return {Promise<Tag>} Deleted Tag
     */
    destroy: function destroy(options) {
        var tasks;

        /**
         * ### Handle Permissions
         * We need to be an authorised user to perform this action
         * @param {Object} options
         * @returns {Object} options
         */
        function handlePermissions(options) {
            return canThis(options.context).destroy.tag(options.id).then(function permissionGranted() {
                return options;
            }).catch(function handleError(error) {
                return errors.handleAPIError(error, 'You do not have permission to remove tags.');
            });
        }

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return tags.read(options).then(function (result) {
                return dataProvider.Tag.destroy(options).then(function () {
                    return result;
                });
            });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [utils.validate(docName), handlePermissions, utils.convertOptions(allowedIncludes), doQuery];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
    }
};

module.exports = tags;
