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

const profileImage = async (frame) => {
    const response = await imageSize.getImageSizeFromPath(frame.file.path);
    // save the image dimensions in new property for file
    frame.file.dimensions = response;

    // CASE: file needs to be a square
    if (frame.file.dimensions.width !== frame.file.dimensions.height) {
        throw new errors.ValidationError({
            message: tpl(messages.isNotSquare)
        });
    }
};

const icon = async (frame) => {
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
        throw new errors.ValidationError({
            message: tpl(message, {extensions: iconExtensions})
        });
    }

    const response = await blogIcon.getIconDimensions(frame.file.path);
    // save the image dimensions in new property for file
    frame.file.dimensions = response;

    if (isIco) {
        // CASE: file needs to be a square
        if (frame.file.dimensions.width !== frame.file.dimensions.height) {
            throw new errors.ValidationError({
                message: tpl(message, {extensions: iconExtensions})
            });
        }

        // CASE: icon needs to be smaller than or equal to 1000px
        if (frame.file.dimensions.width > 1000) {
            throw new errors.ValidationError({
                message: tpl(message, {extensions: iconExtensions})
            });
        }
    }

    // CASE: icon needs to be bigger than or equal to 60px
    // .ico files can contain multiple sizes, we need at least a minimum of 60px (16px is ok, as long as 60px are present as well)
    if (!isSVG && frame.file.dimensions.width < 60) {
        throw new errors.ValidationError({
            message: tpl(message, {extensions: iconExtensions})
        });
    }
};

module.exports = {
    async upload(apiConfig, frame) {
        await jsonSchema.validate(apiConfig, frame);
        if (frame.data.purpose === 'profile_image') {
            await profileImage(frame);
        }
        if (frame.data.purpose === 'icon') {
            await icon(frame);
        }
    }
};
