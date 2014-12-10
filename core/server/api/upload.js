var config  = require('../config'),
    Promise = require('bluebird'),
    fs      = require('fs-extra'),
    storage = require('../storage'),
    errors  = require('../errors'),
    utils   = require('./utils'),

    upload;

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
            filepath;

        // Check if a file was provided
        if (!utils.checkFileExists(options, 'uploadimage')) {
            return Promise.reject(new errors.NoPermissionError('Please select an image.'));
        }

        // Check if the file is valid
        if (!utils.checkFileIsValid(options.uploadimage, config.uploads.contentTypes, config.uploads.extensions)) {
            return Promise.reject(new errors.UnsupportedMediaTypeError('Please select a valid image.'));
        }

        filepath = options.uploadimage.path;

        return store.save(options.uploadimage).then(function (url) {
            return url;
        }).finally(function () {
            // Remove uploaded file from tmp location
            return Promise.promisify(fs.unlink)(filepath);
        });
    }
};

module.exports = upload;
