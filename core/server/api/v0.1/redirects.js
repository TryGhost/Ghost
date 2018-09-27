const fs = require('fs-extra'),
    Promise = require('bluebird'),
    moment = require('moment'),
    path = require('path'),
    config = require('../../config'),
    common = require('../../lib/common'),
    validation = require('../../data/validation'),
    localUtils = require('./utils'),
    web = require('../../web');

let redirectsAPI,
    _private = {};

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

redirectsAPI = {
    download(options) {
        return localUtils.handlePermissions('redirects', 'download')(options)
            .then(() => {
                return _private.readRedirectsFile();
            });
    },
    upload(options) {
        const redirectsPath = path.join(config.getContentPath('data'), 'redirects.json'),
            backupRedirectsPath = path.join(config.getContentPath('data'), `redirects-${moment().format('YYYY-MM-DD-HH-mm-ss')}.json`);

        return localUtils.handlePermissions('redirects', 'upload')(options)
            .then(() => {
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
                        return _private.readRedirectsFile(options.path)
                            .then((content) => {
                                validation.validateRedirects(content);
                                return fs.writeFile(redirectsPath, JSON.stringify(content), 'utf-8');
                            })
                            .then(() => {
                                // CASE: trigger that redirects are getting re-registered
                                web.shared.middlewares.customRedirects.reload();
                            });
                    });
            });
    }
};

module.exports = redirectsAPI;
