// # Tag API
// RESTful API for the Tag resource
var dataProvider = require('../models'),
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
        return dataProvider.Tag.findAll(options).then(function (result) {
            return { tags: result.toJSON() };
        });
    }
};

module.exports = tags;