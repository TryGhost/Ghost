// # Users API
// RESTful API for the User resource
var when            = require('when'),
    _               = require('lodash'),
    dataProvider    = require('../models'),
    settings        = require('./settings'),
    canThis         = require('../permissions').canThis,
    errors          = require('../errors'),
    utils           = require('./utils'),
    globalUtils     = require('../utils'),
    config          = require('../config'),
    mail            = require('./mail'),

    postType;

/**
 * ## Posts API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
postType = {

    /**
     * ## Browse
     * Fetch all users
     * @param {{context}} options (optional)
     * @returns {Promise(Users)} Users Collection
     */
    browse: function browse(options) {
        options = options || {};
        return dataProvider.PostType.findAll(options).then(function (result) {
            return { postTypes: result.toJSON() };
        });
    },

    /**
     * ### Read
     * @param {{id, context}} options
     * @returns {Promise(User)} User
     */
    read: function read(options) {
        var attrs = ['id', 'slug', 'name', 'desc'],
            data = _.pick(options, attrs);

        options = _.omit(options, attrs);

        return dataProvider.PostType.findOne(data, options).then(function (result) {
            if (result) {
                return { postType: [result.toJSON()] };
            }

            return when.reject(new errors.NotFoundError('postType not found.'));
        });
    }
};

module.exports = postType;
