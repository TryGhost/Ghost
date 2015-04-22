// # Tag API
// RESTful API for the Tag resource
var Promise      = require('bluebird'),
    _            = require('lodash'),
    canThis      = require('../permissions').canThis,
    dataProvider = require('../models'),
    errors       = require('../errors'),
    utils        = require('./utils'),

    docName      = 'tags',
    allowedIncludes = ['post_count'],
    tags;

// ## Helpers
function prepareInclude(include) {
    include = include || '';
    include = _.intersection(include.split(','), allowedIncludes);

    return include;
}

/**
 * ## Tags API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
tags = {
    /**
     * ### Browse
     * @param {{context}} options
     * @returns {Promise(Tags)} Tags Collection
     */
    browse: function browse(options) {
        options = options || {};

        return canThis(options.context).browse.tag().then(function () {
            if (options.include) {
                options.include = prepareInclude(options.include);
            }

            return dataProvider.Tag.findPage(options);
        }, function () {
            return Promise.reject(new errors.NoPermissionError('You do not have permission to browse tags.'));
        });
    },

    /**
     * ### Read
     * @param {{id}} options
     * @return {Promise(Tag)} Tag
     */
    read: function read(options) {
        options = options || {};

        var attrs = ['id', 'slug'],
            data = _.pick(options, attrs);

        return canThis(options.context).read.tag().then(function () {
            if (options.include) {
                options.include = prepareInclude(options.include);
            }

            return dataProvider.Tag.findOne(data, options).then(function (result) {
                if (result) {
                    return {tags: [result.toJSON(options)]};
                }

                return Promise.reject(new errors.NotFoundError('Tag not found.'));
            });
        }, function () {
            return Promise.reject(new errors.NoPermissionError('You do not have permission to read tags.'));
        });
    },

    /**
     * ### Add tag
     * @param {Tag} object the tag to create
     * @returns {Promise(Tag)} Newly created Tag
     */
    add: function add(object, options) {
        options = options || {};

        return canThis(options.context).add.tag(object).then(function () {
            if (options.include) {
                options.include = prepareInclude(options.include);
            }

            return utils.checkObject(object, docName).then(function (checkedTagData) {
                return dataProvider.Tag.add(checkedTagData.tags[0], options);
            }).then(function (result) {
                var tag = result.toJSON(options);

                return {tags: [tag]};
            });
        }, function () {
            return Promise.reject(new errors.NoPermissionError('You do not have permission to add tags.'));
        });
    },

    /**
     * ### edit tag
     *
     * @public
     * @param {Tag} object Tag or specific properties to update
     * @param {{id (required), context, include,...}} options
     * @return {Promise(Tag)} Edited Tag
     */
    edit: function edit(object, options) {
        options = options || {};

        return canThis(options.context).edit.tag(options.id).then(function () {
            if (options.include) {
                options.include = prepareInclude(options.include);
            }

            return utils.checkObject(object, docName, options.id).then(function (checkedTagData) {
                return dataProvider.Tag.edit(checkedTagData.tags[0], options);
            }).then(function (result) {
                if (result) {
                    var tag = result.toJSON(options);

                    return {tags: [tag]};
                }

                return Promise.reject(new errors.NotFoundError('Tag not found.'));
            });
        }, function () {
            return Promise.reject(new errors.NoPermissionError('You do not have permission to edit tags.'));
        });
    },

    /**
     * ### Destroy
     *
     * @public
     * @param {{id (required), context,...}} options
     * @return {Promise(Tag)} Deleted Tag
     */
    destroy: function destroy(options) {
        options = options || {};

        return canThis(options.context).destroy.tag(options.id).then(function () {
            return tags.read(options).then(function (result) {
                return dataProvider.Tag.destroy(options).then(function () {
                    return result;
                });
            });
        }, function () {
            return Promise.reject(new errors.NoPermissionError('You do not have permission to remove tags.'));
        });
    }
};

module.exports = tags;
