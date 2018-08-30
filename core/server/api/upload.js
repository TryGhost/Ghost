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
     * We only allow multiple uploads internally - see images middlewares.
     *
     * @public
     * @param {{context}} options
     * @returns {Promise<String>} location of uploaded file
     */
    add: Promise.method(function (options) {
        const store = storage.getStorage();

        if (options.files) {
            return Promise.map(options.files, (file) => {
                return store
                    .save(file)
                    .finally(function () {
                        // Remove uploaded file from tmp location
                        return fs.unlink(file.path);
                    });
            }).then((paths) => {
                return paths[0];
            });
        }

        return store.save(options).finally(function () {
            // Remove uploaded file from tmp location
            return fs.unlink(options.path);
        });
    })
};

module.exports = upload;
