var common = require('../../../lib/common'),
    imageLib = require('../../../lib/image');

module.exports = function profileImage() {
    // we checked for a valid image file, now we need to do validations for profile image
    return function profileImageValidation(req, res, next) {
        return imageLib.blogIcon.getIconDimensions(req.file.path).then(function (response) {
            // save the image dimensions in new property for file
            req.file.dimensions = response;

            // CASE: file needs to be a square
            if (req.file.dimensions.width !== req.file.dimensions.height) {
                return next(new common.errors.ValidationError({
                    message: common.i18n.t('errors.api.images.isNotSquare')
                }));
            }

            next();
        }).catch(function (err) {
            next(err);
        });
    };
};
