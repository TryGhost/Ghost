const fs = require('fs-extra');
const path = require('path');
const Promise = require('bluebird');
const moment = require('moment-timezone');
const config = require('../../config');
const common = require('../../lib/common');
const validation = require('../../data/validation');
const web = require('../../web');

const _private = {};

_private.readRedirectsFile = (customRedirectsPath) => {
    const redirectsPath = customRedirectsPath || path.join(config.getContentPath('data'), 'redirects.json');

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

module.exports = {
    docName: 'redirects',

    download: {
        headers: {
            disposition: {
                type: 'file',
                value: 'redirects.json'
            }
        },
        permissions: true,
        query() {
            return _private.readRedirectsFile();
        }
    },

    upload: {
        permissions: true,
        headers: {
            cacheInvalidate: true
        },
        query(frame) {
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
                    return _private.readRedirectsFile(frame.file.path)
                        .then((content) => {
                            validation.validateRedirects(content);
                            return fs.writeFile(redirectsPath, JSON.stringify(content), 'utf-8');
                        })
                        .then(() => {
                            // CASE: trigger that redirects are getting re-registered
                            web.shared.middlewares.customRedirects.reload();
                        });
                });
        }
    }
};
