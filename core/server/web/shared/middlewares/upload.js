const config = require('../../../config');
const os = require('os');
const multer = require('multer');
const fs = require('fs-extra');
const common = require('../../../lib/common');

const upload = {
    enabledClear: config.get('uploadClear') || true,
    multer: multer({dest: os.tmpdir()})
};

const deleteSingleFile = file => fs.unlink(file.path).catch(err => common.logging.error(err));

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

module.exports = {single};
