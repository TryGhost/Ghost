const jsonSchema = require('../utils/json-schema');
const config = require('../../../../../config');
const common = require('../../../../../lib/common');
const imageLib = require('../../../../../lib/image');

const profileImage = (frame) => {
    return imageLib.imageSize.getImageSizeFromPath(frame.file.path).then((response) => {
        // save the image dimensions in new property for file
        frame.file.dimensions = response;

        // CASE: file needs to be a square
        if (frame.file.dimensions.width !== frame.file.dimensions.height) {
            return Promise.reject(new common.errors.ValidationError({
                message: common.i18n.t('errors.api.images.isNotSquare')
            }));
        }
    });
};

const icon = (frame) => {
    const iconExtensions = (config.get('uploads').icons && config.get('uploads').icons.extensions) || [];

    const validIconFileSize = (size) => {
        return (size / 1024) <= 100;
    };

    // CASE: file should not be larger than 100kb
    if (!validIconFileSize(frame.file.size)) {
        return Promise.reject(new common.errors.ValidationError({
            message: common.i18n.t('errors.api.icons.invalidFile', {extensions: iconExtensions})
        }));
    }

    return imageLib.blogIcon.getIconDimensions(frame.file.path).then((response) => {
        // save the image dimensions in new property for file
        frame.file.dimensions = response;

        // CASE: file needs to be a square
        if (frame.file.dimensions.width !== frame.file.dimensions.height) {
            return Promise.reject(new common.errors.ValidationError({
                message: common.i18n.t('errors.api.icons.invalidFile', {extensions: iconExtensions})
            }));
        }

        // CASE: icon needs to be bigger than or equal to 60px
        // .ico files can contain multiple sizes, we need at least a minimum of 60px (16px is ok, as long as 60px are present as well)
        if (frame.file.dimensions.width < 60) {
            return Promise.reject(new common.errors.ValidationError({
                message: common.i18n.t('errors.api.icons.invalidFile', {extensions: iconExtensions})
            }));
        }

        // CASE: icon needs to be smaller than or equal to 1000px
        if (frame.file.dimensions.width > 1000) {
            return Promise.reject(new common.errors.ValidationError({
                message: common.i18n.t('errors.api.icons.invalidFile', {extensions: iconExtensions})
            }));
        }
    });
};

module.exports = {
    upload(apiConfig, frame) {
        return Promise.resolve()
            .then(() => {
                const schema = require('./schemas/images-upload');
                const definitions = require('./schemas/images');
                return jsonSchema.validate(schema, definitions, frame.data);
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
