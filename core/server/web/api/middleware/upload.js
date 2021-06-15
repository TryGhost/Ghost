const path = require('path');
const os = require('os');
const multer = require('multer');
const fs = require('fs-extra');
const errors = require('@tryghost/errors');
const config = require('../../../../shared/config');
const i18n = require('../../../../shared/i18n');
const logging = require('@tryghost/logging');

const upload = {
    enabledClear: config.get('uploadClear') || true,
    multer: multer({dest: os.tmpdir()})
};

const deleteSingleFile = file => fs.unlink(file.path).catch(err => logging.error(err));

const single = name => (req, res, next) => {
    const singleUpload = upload.multer.single(name);
    singleUpload(req, res, (err) => {
        if (err) {
            return next(err);
        }
        if (upload.enabledClear) {
            const deleteFiles = () => {
                res.removeListener('finish', deleteFiles);
                res.removeListener('close', deleteFiles);
                if (!req.disableUploadClear) {
                    if (req.files) {
                        return req.files.forEach(deleteSingleFile);
                    }

                    if (req.file) {
                        return deleteSingleFile(req.file);
                    }
                }
            };
            if (!req.disableUploadClear) {
                res.on('finish', deleteFiles);
                res.on('close', deleteFiles);
            }
        }
        next();
    });
};

const checkFileExists = (fileData) => {
    return !!(fileData.mimetype && fileData.path);
};

const checkFileIsValid = (fileData, types, extensions) => {
    const type = fileData.mimetype;

    if (types.includes(type) && extensions.includes(fileData.ext)) {
        return true;
    }

    return false;
};

const validation = function (options) {
    const type = options.type;

    // if we finish the data/importer logic, we forward the request to the specified importer
    return function uploadValidation(req, res, next) {
        const extensions = (config.get('uploads')[type] && config.get('uploads')[type].extensions) || [];
        const contentTypes = (config.get('uploads')[type] && config.get('uploads')[type].contentTypes) || [];

        req.file = req.file || {};
        req.file.name = req.file.originalname;
        req.file.type = req.file.mimetype;

        // Check if a file was provided
        if (!checkFileExists(req.file)) {
            return next(new errors.ValidationError({
                message: i18n.t(`errors.api.${type}.missingFile`)
            }));
        }

        req.file.ext = path.extname(req.file.name).toLowerCase();

        // Check if the file is valid
        if (!checkFileIsValid(req.file, contentTypes, extensions)) {
            return next(new errors.UnsupportedMediaTypeError({
                message: i18n.t(`errors.api.${type}.invalidFile`, {extensions: extensions})
            }));
        }

        next();
    };
};

module.exports = {
    single,
    validation
};

// Exports for testing only
module.exports._test = {
    checkFileExists,
    checkFileIsValid
};
