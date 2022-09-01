const jsonSchema = require('../utils/json-schema');
const config = require('../../../../../../shared/config');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const {imageSize, blogIcon} = require('../../../../../lib/image');

const messages = {
    isNotSquare: 'Please select a valid image file with square dimensions.',
    invalidIcoFile: 'Ico icons must be square, at least 60x60px, and under 200kB.',
    invalidFile: 'Icon must be a .jpg, .webp, .svg or .png file, at least 60x60px, under 20MB.'
};

const profileImage = (frame) => {
    return imageSize.getImageSizeFromPath(frame.file.path).then((response) => {
        // save the image dimensions in new property for file
        frame.file.dimensions = response;

        // CASE: file needs to be a square
        if (frame.file.dimensions.width !== frame.file.dimensions.height) {
            return Promise.reject(new errors.ValidationError({
                message: tpl(messages.isNotSquare)
            }));
        }
    });
};

const icon = (frame) => {
    const iconExtensions = (config.get('uploads').icons && config.get('uploads').icons.extensions) || [];

    // We don't support resizing .ico files, so we set a lower max upload size
    const isIco = frame.file.ext.toLowerCase() === '.ico';
    const isSVG = frame.file.ext.toLowerCase() === '.svg';

    const validIconFileSize = (size) => {
        if (isIco) {
            // Keep using kB instead of KB
            return (size / 1024) <= 200;
        }
        // Use MB representation (not MiB)
        return (size / 1000 / 1000) <= 20;
    };

    const message = isIco ? messages.invalidIcoFile : messages.invalidFile;

    // CASE: file should not be larger than 20MB
    if (!validIconFileSize(frame.file.size)) {
        return Promise.reject(new errors.ValidationError({
            message: tpl(message, {extensions: iconExtensions})
        }));
    }

    return blogIcon.getIconDimensions(frame.file.path).then((response) => {
        // save the image dimensions in new property for file
        frame.file.dimensions = response;

        if (isIco) {
            // CASE: file needs to be a square
            if (frame.file.dimensions.width !== frame.file.dimensions.height) {
                return Promise.reject(new errors.ValidationError({
                    message: tpl(message, {extensions: iconExtensions})
                }));
            }

            // CASE: icon needs to be smaller than or equal to 1000px
            if (frame.file.dimensions.width > 1000) {
                return Promise.reject(new errors.ValidationError({
                    message: tpl(message, {extensions: iconExtensions})
                }));
            }
        }

        // CASE: icon needs to be bigger than or equal to 60px
        // .ico files can contain multiple sizes, we need at least a minimum of 60px (16px is ok, as long as 60px are present as well)
        if (!isSVG && frame.file.dimensions.width < 60) {
            return Promise.reject(new errors.ValidationError({
                message: tpl(message, {extensions: iconExtensions})
            }));
        }
    });
};

module.exports = {
    upload(apiConfig, frame) {
        return Promise.resolve()
            .then(() => {
                return jsonSchema.validate(apiConfig, frame);
            })
            .then(() => {
                if (frame.data.purpose === 'profile_image') {
                    return profileImage(frame);
                }
            })
            .then(() => {
                if (frame.data.purpose === 'icon') {
                    return icon(frame);
                }
            });
    }
};
