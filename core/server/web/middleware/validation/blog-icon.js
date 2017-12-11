var config = require('../../../config'),
    common = require('../../../lib/common'),
    blogIconUtils = require('../../../utils/blog-icon'),
    validIconFileSize;

validIconFileSize = function validIconFileSize(size) {
    return size / 1024 <= 100 ? true : false;
};

module.exports = function blogIcon() {
    // we checked for a valid image file, now we need to do validations for blog icons
    return function blogIconValidation(req, res, next) {
        var iconExtensions = (config.get('uploads').icons && config.get('uploads').icons.extensions) || [];

        // CASE: file should not be larger than 100kb
        if (!validIconFileSize(req.file.size)) {
            return next(new common.errors.ValidationError({message: common.i18n.t('errors.api.icons.invalidFile', {extensions: iconExtensions})}));
        }

        return blogIconUtils.getIconDimensions(req.file.path).then(function (response) {
            // save the image dimensions in new property for file
            req.file.dimensions = response;

            // CASE: file needs to be a square
            if (req.file.dimensions.width !== req.file.dimensions.height) {
                return next(new common.errors.ValidationError({message: common.i18n.t('errors.api.icons.invalidFile', {extensions: iconExtensions})}));
            }

            // CASE: icon needs to be bigger than or equal to 60px
            // .ico files can contain multiple sizes, we need at least a minimum of 60px (16px is ok, as long as 60px are present as well)
            if (req.file.dimensions.width < 60) {
                return next(new common.errors.ValidationError({message: common.i18n.t('errors.api.icons.invalidFile', {extensions: iconExtensions})}));
            }

            // CASE: icon needs to be smaller than or equal to 1000px
            if (req.file.dimensions.width > 1000) {
                return next(new common.errors.ValidationError({message: common.i18n.t('errors.api.icons.invalidFile', {extensions: iconExtensions})}));
            }

            next();
        }).catch(function (err) {
            next(err);
        });
    };
};
