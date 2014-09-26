var _       = require('lodash'),
    config  = require('../config'),
    Promise = require('bluebird'),
    path    = require('path'),
    fs      = require('fs-extra'),
    storage = require('../storage'),
    errors  = require('../errors'),

    upload;

function isImage(type, ext) {
    if (_.contains(config.uploads.contentTypes, type) && _.contains(config.uploads.extensions, ext)) {
        return true;
    }
    return false;
}

/**
 * ## Upload API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
upload = {

    /**
     * ### Add Image
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Success
     */
    add: function (options) {
        var store = storage.getStorage(),
            type,
            ext,
            filepath;

        if (!options.uploadimage || !options.uploadimage.type || !options.uploadimage.path) {
            return Promise.reject(new errors.NoPermissionError('Please select an image.'));
        }

        type = options.uploadimage.type;
        ext = path.extname(options.uploadimage.name).toLowerCase();
        filepath = options.uploadimage.path;

        return Promise.resolve(isImage(type, ext)).then(function (result) {
            if (!result) {
                return Promise.reject(new errors.UnsupportedMediaTypeError('Please select a valid image.'));
            }
        }).then(function () {
            return store.save(options.uploadimage);
        }).then(function (url) {
            return url;
        }).finally(function () {
            // Remove uploaded file from tmp location
            return Promise.promisify(fs.unlink)(filepath);
        });
    }
};

module.exports = upload;
