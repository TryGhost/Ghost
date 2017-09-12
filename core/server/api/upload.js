var Promise = require('bluebird'),
    fs = require('fs-extra'),
    pUnlink = Promise.promisify(fs.unlink),
    storage = require('../adapters/storage'),
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

        return store.save(options).finally(function () {
            // Remove uploaded file from tmp location
            return pUnlink(options.path);
        });
    })
};

module.exports = upload;
