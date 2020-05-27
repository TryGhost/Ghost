const fs = require('fs-extra');
const path = require('path');
const Promise = require('bluebird');
const moment = require('moment-timezone');

const validation = require('./validation');

const config = require('../../../shared/config');
const {i18n} = require('../../../server/lib/common');
const errors = require('@tryghost/errors');

const readRedirectsFile = (redirectsPath) => {
    return fs.readFile(redirectsPath, 'utf-8')
        .then((content) => {
            try {
                content = JSON.parse(content);
            } catch (err) {
                throw new errors.BadRequestError({
                    message: i18n.t('errors.general.jsonParse', {context: err.message})
                });
            }

            return content;
        })
        .catch((err) => {
            if (err.code === 'ENOENT') {
                return Promise.resolve([]);
            }

            if (errors.utils.isIgnitionError(err)) {
                throw err;
            }

            throw new errors.NotFoundError({
                err: err
            });
        });
};

const setFromFilePath = (filePath) => {
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
                    validation.validate(content);
                    return fs.writeFile(redirectsPath, JSON.stringify(content), 'utf-8');
                });
        });
};

const get = () => {
    return readRedirectsFile(path.join(config.getContentPath('data'), 'redirects.json'));
};

module.exports.get = get;
module.exports.setFromFilePath = setFromFilePath;
