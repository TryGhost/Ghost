// # Tag API
// RESTful API for the Tag resource
var when       = require('when'),
    canThis    = require('../permissions').canThis,
    dataProvider = require('../models'),
    errors     = require('../errors'),
    tags;

/**
 * ## Tags API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
tags = {
    /**
     * ### Browse
     * @param {{context}} options
     * @returns {Promise(Tags)}
     */
    browse: function browse(options) {
        return canThis(options.context).browse.tag().then(function () {
            return dataProvider.Tag.findAll(options).then(function (result) {
                return { tags: result.toJSON() };
            });

        }, function () {
            return when.reject(new errors.NoPermissionError('You do not have permission to browse tags.'));
        });
    }
};

module.exports = tags;