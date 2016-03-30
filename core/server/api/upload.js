var config  = require('../config'),
    Promise = require('bluebird'),
    fs      = require('fs-extra'),
    pUnlink = Promise.promisify(fs.unlink),
    storage = require('../storage'),
    errors  = require('../errors'),
    utils   = require('./utils'),
    i18n    = require('../i18n'),

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
     * @returns {Promise<String>} location of uploaded file
     */
    add: Promise.method(function (options) {
        var store = storage.getStorage();

        // Public interface of the storage module's `save` method requires
        // the file's name to be on the .name property.
        options.name = options.originalname;
        options.type = options.mimetype;

        // Check if a file was provided
        if (!utils.checkFileExists(options)) {
            throw new errors.NoPermissionError(i18n.t('errors.api.upload.pleaseSelectImage'));
        }

        // Check if the file is valid
        if (!utils.checkFileIsValid(options, config.uploads.contentTypes, config.uploads.extensions)) {
            throw new errors.UnsupportedMediaTypeError(i18n.t('errors.api.upload.pleaseSelectValidImage'));
        }

        return store.save(options).finally(function () {
            // Remove uploaded file from tmp location
            return pUnlink(options.path);
        });
    })
};

module.exports = upload;
