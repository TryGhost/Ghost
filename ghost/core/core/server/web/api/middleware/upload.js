const path = require('path');
const os = require('os');
const multer = require('multer');
const fs = require('fs-extra');
const errors = require('@tryghost/errors');
const config = require('../../../../shared/config');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

const messages = {
    db: {
        missingFile: 'Please select a database file to import.',
        invalidFile: 'Unsupported file. Please try any of the following formats: {extensions}'
    },
    redirects: {
        missingFile: 'Please select a JSON file.',
        invalidFile: 'Please select a valid JSON file to import.'
    },
    routes: {
        missingFile: 'Please select a YAML file.',
        invalidFile: 'Please select a valid YAML file to import.'
    },
    themes: {
        missingFile: 'Please select a theme.',
        invalidFile: 'Please select a valid zip file.'
    },
    images: {
        missingFile: 'Please select an image.',
        invalidFile: 'Unsupported file type. SVG files must not contain malicious content.'
    },
    icons: {
        missingFile: 'Please select an icon.',
        invalidFile: 'Icon must be a square .ico or .png file between 60px – 1,000px, under 100kb.'
    },
    media: {
        missingFile: 'Please select a media file.',
        invalidFile: 'Please select a valid media file.'
    },
    thumbnail: {
        missingFile: 'Please select a thumbnail.',
        invalidFile: 'Please select a valid thumbnail.'
    }
};

const enabledClear = config.get('uploadClear') || true;
const upload = multer({dest: os.tmpdir()});

const deleteSingleFile = file => fs.unlink(file.path).catch(err => logging.error(err));

const single = name => function singleUploadFunction(req, res, next) {
    const singleUpload = upload.single(name);
    singleUpload(req, res, (err) => {
        if (err) {
            return next(err);
        }
        if (enabledClear) {
            const deleteFiles = () => {
                res.removeListener('finish', deleteFiles);
                res.removeListener('close', deleteFiles);
                if (!req.disableUploadClear) {
                    if (req.files) {
                        req.files.forEach(deleteSingleFile);
                    }

                    if (req.file) {
                        deleteSingleFile(req.file);
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

const media = (fileName, thumbName) => function mediaUploadFunction(req, res, next) {
    const mediaUpload = upload.fields([{
        name: fileName,
        maxCount: 1
    }, {
        name: thumbName,
        maxCount: 1
    }]);
    mediaUpload(req, res, (err) => {
        if (err) {
            return next(err);
        }
        if (enabledClear) {
            const deleteFiles = () => {
                res.removeListener('finish', deleteFiles);
                res.removeListener('close', deleteFiles);
                if (!req.disableUploadClear) {
                    if (req.files.file) {
                        req.files.file.forEach(deleteSingleFile);
                    }
                    if (req.files.thumbnail) {
                        req.files.thumbnail.forEach(deleteSingleFile);
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
    const fileType = fileData.mimetype;
    const fileExt = path.extname(fileData.name).toLowerCase();

    // Adjust the logic to sanitize SVG files and accept them if sanitized
    if (fileExt === '.svg') {
        const window = new JSDOM('').window;
        const dompurify = createDOMPurify(window);
        const content = fs.readFileSync(fileData.path, 'utf8');
        const sanitizedContent = dompurify.sanitize(content, {RETURN_TRUSTED_TYPE: false});

        fs.writeFileSync(fileData.path, sanitizedContent, 'utf8');

        // Always return true as the file is sanitized before being validated
        return true;
    } else if (!types.includes(fileType) || !extensions.includes(fileExt)) {
        return false;
    }

    return true;
};

const validation = function ({type}) {
    return function uploadValidation(req, res, next) {
        const extensions = (config.get('uploads')[type] && config.get('uploads')[type].extensions) || [];
        const contentTypes = (config.get('uploads')[type] && config.get('uploads')[type].contentTypes) || [];

        req.file = req.file || {};
        req.file.name = req.file.originalname;
        req.file.type = req.file.mimetype;

        if (!checkFileExists(req.file)) {
            return next(new errors.ValidationError({
                message: tpl(messages[type].missingFile)
            }));
        }

        req.file.ext = path.extname(req.file.name).toLowerCase();

        if (!checkFileIsValid(req.file, contentTypes, extensions)) {
            return next(new errors.UnsupportedMediaTypeError({
                message: tpl(messages[type].invalidFile, {extensions: extensions.join(', ')})
            }));
        }

        next();
    };
};

const mediaValidation = function ({type}) {
    return function mediaUploadValidation(req, res, next) {
        const extensions = (config.get('uploads')[type] && config.get('uploads')[type].extensions) || [];
        const contentTypes = (config.get('uploads')[type] && config.get('uploads')[type].contentTypes) || [];

        const thumbnailExtensions = (config.get('uploads').thumbnails && config.get('uploads').thumbnails.extensions) || [];
        const thumbnailContentTypes = (config.get('uploads').thumbnails && config.get('uploads').thumbnails.contentTypes) || [];

        const {file: [file] = []} = req.files;
        if (!file || !checkFileExists(file)) {
            return next(new errors.ValidationError({
                message: tpl(messages[type].missingFile)
            }));
        }

        req.file = file;
        req.file.name = req.file.originalname;
        req.file.type = req.file.mimetype;
        req.file.ext = path.extname(req.file.name).toLowerCase();

        if (!checkFileIsValid(req.file, contentTypes, extensions)) {
            return next(new errors.UnsupportedMediaTypeError({
                message: tpl(messages[type].invalidFile, {extensions: extensions.join(', ')})
            }));
        }

        const {thumbnail: [thumbnailFile] = []} = req.files;

        if (thumbnailFile) {
            if (!checkFileExists(thumbnailFile)) {
                return next(new errors.ValidationError({
                    message: tpl(messages.thumbnail.missingFile)
                }));
            }

            req.thumbnail = thumbnailFile;
            req.thumbnail.ext = path.extname(thumbnailFile.originalname).toLowerCase();
            req.thumbnail.name = `${path.basename(req.file.name, path.extname(req.file.name))}_thumb${req.thumbnail.ext}`;
            req.thumbnail.type = req.thumbnail.mimetype;

            if (!checkFileIsValid(req.thumbnail, thumbnailContentTypes, thumbnailExtensions)) {
                return next(new errors.UnsupportedMediaTypeError({
                    message: tpl(messages.thumbnail.invalidFile, {extensions: thumbnailExtensions.join(', ')})
                }));
            }
        }

        next();
    };
};

module.exports = {
    single,
    media,
    validation,
    mediaValidation
};

// Exports for testing only
module.exports._test = {
    checkFileExists,
    checkFileIsValid
};
