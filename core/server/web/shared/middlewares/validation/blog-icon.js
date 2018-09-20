const config = require('../../../../config');
const common = require('../../../../lib/common');
const imageLib = require('../../../../lib/image');

const validIconFileSize = (size) => {
    return (size / 1024) <= 100;
};

module.exports = function blogIcon() {
    // we checked for a valid image file, now we need to do validations for blog icons
    return function blogIconValidation(req, res, next) {
        const iconExtensions = (config.get('uploads').icons && config.get('uploads').icons.extensions) || [];

        // CASE: file should not be larger than 100kb
        if (!validIconFileSize(req.file.size)) {
            return next(new common.errors.ValidationError({
                message: common.i18n.t('errors.api.icons.invalidFile', {extensions: iconExtensions})
            }));
        }

        return imageLib.blogIcon.getIconDimensions(req.file.path).then((response) => {
            // save the image dimensions in new property for file
            req.file.dimensions = response;

            // CASE: file needs to be a square
            if (req.file.dimensions.width !== req.file.dimensions.height) {
                return next(new common.errors.ValidationError({
                    message: common.i18n.t('errors.api.icons.invalidFile', {extensions: iconExtensions})
                }));
            }

            // CASE: icon needs to be bigger than or equal to 60px
            // .ico files can contain multiple sizes, we need at least a minimum of 60px (16px is ok, as long as 60px are present as well)
            if (req.file.dimensions.width < 60) {
                return next(new common.errors.ValidationError({
                    message: common.i18n.t('errors.api.icons.invalidFile', {extensions: iconExtensions})
                }));
            }

            // CASE: icon needs to be smaller than or equal to 1000px
            if (req.file.dimensions.width > 1000) {
                return next(new common.errors.ValidationError({
                    message: common.i18n.t('errors.api.icons.invalidFile', {extensions: iconExtensions})
                }));
            }

            next();
        }).catch((err) => {
            next(err);
        });
    };
};
