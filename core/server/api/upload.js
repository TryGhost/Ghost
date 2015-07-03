var config   = require('../config'),
    Promise  = require('bluebird'),
    fs       = require('fs-extra'),
    storage  = require('../storage'),
    errors   = require('../errors'),
    utils    = require('./utils'),
    pipeline = require('../utils/pipeline'),

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
        var tasks,
            attrs = ['uploadimage'];

        function validate(options) {
            // Check if a file was provided
            if (!utils.checkFileExists(options.data, 'uploadimage')) {
                return Promise.reject(new errors.NoPermissionError('Please select an image.'));
            }

            // Check if the file is valid
            if (!utils.checkFileIsValid(options.data.uploadimage, config.uploads.contentTypes, config.uploads.extensions)) {
                return Promise.reject(new errors.UnsupportedMediaTypeError('Please select a valid image.'));
            }

            return options;
        }

        function storeUpload(options) {
            var store = storage.getStorage(),
                filepath = options.data.uploadimage.path;

            return store.save(options.data.uploadimage).then(function (url) {
                return url;
            }).finally(function () {
                // Remove uploaded file from tmp location
                return Promise.promisify(fs.unlink)(filepath);
            });
        }

        tasks = [
            utils.validate('upload', {attrs: attrs}),
            validate,
            storeUpload
        ];

        return pipeline(tasks, options);
    }
};

module.exports = upload;
