var errors = require('../../errors'),
    config = require('../../config'),
    ICO = require('icojs'),
    fs = require('fs'),
    Promise = require('bluebird'),
    sizeOf = require('image-size'),
    i18n = require('../../i18n'),
    _ = require('lodash'),
    validIconSize,
    getIconDimensions;

validIconSize = function validIconSize(size) {
    return size / 1024 <= 100 ? true : false;
};

getIconDimensions = function getIconDimensions(icon) {
    return new Promise(function getImageSize(resolve, reject) {
        var arrayBuffer;

        // image-size doesn't support .ico files
        if (icon.name.match(/.ico$/i)) {
            arrayBuffer = new Uint8Array(fs.readFileSync(icon.path)).buffer;
            ICO.parse(arrayBuffer).then(function (result, error) {
                if (error) {
                    return reject(new errors.ValidationError({message: i18n.t('errors.api.icons.couldNotGetSize', {file: icon.name, error: error.message})}));
                }

                // CASE: ico file contains only one size
                if (result.length === 1) {
                    return resolve({
                        width: result[0].width,
                        height: result[0].height
                    });
                } else {
                    // CASE: ico file contains multiple sizes, return only the max size
                    return resolve({
                        width: _.maxBy(result, function (w) {return w.width;}).width,
                        height: _.maxBy(result, function (h) {return h.height;}).height
                    });
                }
            });
        } else {
            sizeOf(icon.path, function (err, dimensions) {
                if (err) {
                    return reject(new errors.ValidationError({message: i18n.t('errors.api.icons.couldNotGetSize', {file: icon.name, error: err.message})}));
                }

                return resolve({
                    width: dimensions.width,
                    height: dimensions.height
                });
            });
        }
    });
};

module.exports = function blogIcon() {
    // we checked for a valid image file, now we need to do validations for blog icons
    return function blogIconValidation(req, res, next) {
        var iconExtensions = (config.get('uploads').icons && config.get('uploads').icons.extensions) || [];

        // CASE: file should not be larger than 100kb
        if (!validIconSize(req.file.size)) {
            return next(new errors.RequestEntityTooLargeError({message: i18n.t('errors.api.icons.fileSizeTooLarge', {extensions: iconExtensions})}));
        }

        return getIconDimensions(req.file).then(function (dimensions) {
            // save the image dimensions in new property for file
            req.file.dimensions = dimensions;

            // CASE: file needs to be a square
            if (req.file.dimensions.width !== req.file.dimensions.height) {
                return next(new errors.ValidationError({message: i18n.t('errors.api.icons.iconNotSquare', {extensions: iconExtensions})}));
            }

            // CASE: icon needs to be bigger than 32px
            // .ico files can contain multiple sizes, we need at least a minimum of 32px (16px is ok, as long as 32px are present as well)
            if (req.file.dimensions.width < 32) {
                return next(new errors.ValidationError({message: i18n.t('errors.api.icons.fileTooSmall', {extensions: iconExtensions})}));
            }

            // CASE: icon needs to be smaller than 1000px
            if (req.file.dimensions.width > 1000) {
                return next(new errors.ValidationError({message: i18n.t('errors.api.icons.fileTooLarge', {extensions: iconExtensions})}));
            }

            next();
        });
    };
};
