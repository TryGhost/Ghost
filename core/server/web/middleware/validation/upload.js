var apiUtils = require('../../../api/utils'),
    common = require('../../../lib/common'),
    config = require('../../../config');

module.exports = function upload(options) {
    var type = options.type;

    // if we finish the data/importer logic, we forward the request to the specified importer
    return function uploadValidation(req, res, next) {
        var extensions = (config.get('uploads')[type] && config.get('uploads')[type].extensions) || [],
            contentTypes = (config.get('uploads')[type] && config.get('uploads')[type].contentTypes) || [];

        req.file = req.file || {};
        req.file.name = req.file.originalname;
        req.file.type = req.file.mimetype;

        // Check if a file was provided
        if (!apiUtils.checkFileExists(req.file)) {
            return next(new common.errors.NoPermissionError({
                message: common.i18n.t('errors.api.' + type + '.missingFile')
            }));
        }

        // Check if the file is valid
        if (!apiUtils.checkFileIsValid(req.file, contentTypes, extensions)) {
            return next(new common.errors.UnsupportedMediaTypeError({
                message: common.i18n.t('errors.api.' + type + '.invalidFile', {extensions: extensions})
            }));
        }

        next();
    };
};
