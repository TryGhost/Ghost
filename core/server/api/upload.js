const Promise = require('bluebird'),
    fs = require('fs-extra'),
    storage = require('../adapters/storage');

let upload;

/**
 * ## Upload API Methods
 *
 * **See:** [API Methods](constants.js.html#api%20methods)
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
            return fs.unlink(options.path);
        });
    })
};

module.exports = upload;
