var when    = require('when'),
    path    = require('path'),
    nodefn  = require('when/node'),
    fs      = require('fs-extra'),
    storage = require('../storage'),
    errors  = require('../errors'),

    upload;



function isImage(type, ext) {
    if ((type === 'image/jpeg' || type === 'image/png' || type === 'image/gif' || type === 'image/svg+xml')
            && (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif' || ext === '.svg' || ext === '.svgz')) {
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
    'add': function (options) {
        var store = storage.get_storage(),
            type,
            ext,
            filepath;

        if (!options.uploadimage || !options.uploadimage.type || !options.uploadimage.path) {
            return when.reject(new errors.NoPermissionError('Please select an image.'));
        }

        type = options.uploadimage.type;
        ext = path.extname(options.uploadimage.name).toLowerCase();
        filepath = options.uploadimage.path;

        return when(isImage(type, ext)).then(function (result) {
            if (!result) {
                return when.reject(new errors.UnsupportedMediaTypeError('Please select a valid image.'));
            }
        }).then(function () {
            return store.save(options.uploadimage);
        }).then(function (url) {
            return when.resolve(url);
        }).finally(function () {
            // Remove uploaded file from tmp location
            return nodefn.call(fs.unlink, filepath);
        });
    }
};

module.exports = upload;