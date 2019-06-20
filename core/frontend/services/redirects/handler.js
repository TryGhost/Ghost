const fs = require('fs-extra');
const path = require('path');
const Promise = require('bluebird');
const moment = require('moment-timezone');

const config = require('../../../server/config');
const common = require('../../../server/lib/common');
const validation = require('../../../server/data/validation');

const readRedirectsFile = (customRedirectsPath) => {
    const redirectsPath = customRedirectsPath;

    return fs.readFile(redirectsPath, 'utf-8')
        .then((content) => {
            try {
                content = JSON.parse(content);
            } catch (err) {
                throw new common.errors.BadRequestError({
                    message: common.i18n.t('errors.general.jsonParse', {context: err.message})
                });
            }

            return content;
        })
        .catch((err) => {
            if (err.code === 'ENOENT') {
                return Promise.resolve([]);
            }

            if (common.errors.utils.isIgnitionError(err)) {
                throw err;
            }

            throw new common.errors.NotFoundError({
                err: err
            });
        });
};

const activate = (filePath) => {
    const redirectsPath = path.join(config.getContentPath('data'), 'redirects.json');
    const backupRedirectsPath = path.join(config.getContentPath('data'), `redirects-${moment().format('YYYY-MM-DD-HH-mm-ss')}.json`);

    return fs.pathExists(redirectsPath)
        .then((exists) => {
            if (!exists) {
                return null;
            }

            return fs.pathExists(backupRedirectsPath)
                .then((exists) => {
                    if (!exists) {
                        return null;
                    }

                    return fs.unlink(backupRedirectsPath);
                })
                .then(() => {
                    return fs.move(redirectsPath, backupRedirectsPath);
                });
        })
        .then(() => {
            return readRedirectsFile(filePath)
                .then((content) => {
                    validation.validateRedirects(content);
                    return fs.writeFile(redirectsPath, JSON.stringify(content), 'utf-8');
                });
        });
};

module.exports.readRedirectsFile = readRedirectsFile;
module.exports.activate = activate;
