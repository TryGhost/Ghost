var apiUtils = require('../../api/utils'),
    errors = require('../../errors'),
    config = require('../../config'),
    i18n = require('../../i18n');

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
            return next(new errors.NoPermissionError({message: i18n.t('errors.api.' + type + '.missingFile')}));
        }

        // Check if the file is valid
        if (!apiUtils.checkFileIsValid(req.file, contentTypes, extensions)) {
            return next(new errors.UnsupportedMediaTypeError({message: i18n.t('errors.api.' + type + '.invalidFile', {extensions: extensions})}));
        }

        next();
    };
};
