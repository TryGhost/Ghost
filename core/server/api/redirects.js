const fs = require('fs-extra'),
    Promise = require('bluebird'),
    moment = require('moment'),
    path = require('path'),
    config = require('../config'),
    common = require('../lib/common'),
    validation = require('../data/validation'),
    localUtils = require('./utils'),
    customRedirectsMiddleware = require('../web/middleware/custom-redirects');

let redirectsAPI,
    _private = {};

_private.readRedirectsFile = function readRedirectsFile(customRedirectsPath) {
    let redirectsPath = customRedirectsPath || path.join(config.getContentPath('data'), 'redirects.json');

    return fs.readFile(redirectsPath, 'utf-8')
        .then(function serveContent(content) {
            try {
                content = JSON.parse(content);
            } catch (err) {
                throw new common.errors.BadRequestError({
                    message: common.i18n.t('errors.general.jsonParse', {context: err.message})
                });
            }

            return content;
        })
        .catch(function handleError(err) {
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
    download: function download(options) {
        return localUtils.handlePermissions('redirects', 'download')(options)
            .then(function () {
                return _private.readRedirectsFile();
            });
    },
    upload: function upload(options) {
        let redirectsPath = path.join(config.getContentPath('data'), 'redirects.json'),
            backupRedirectsPath = path.join(config.getContentPath('data'), `redirects-${moment().format('YYYY-MM-DD-HH-mm-ss')}.json`);

        return localUtils.handlePermissions('redirects', 'upload')(options)
            .then(function backupOldRedirectsFile() {
                return fs.pathExists(redirectsPath)
                    .then(function (exists) {
                        if (!exists) {
                            return null;
                        }

                        return fs.pathExists(backupRedirectsPath)
                            .then(function (exists) {
                                if (!exists) {
                                    return null;
                                }

                                return fs.unlink(backupRedirectsPath);
                            })
                            .then(function () {
                                return fs.move(redirectsPath, backupRedirectsPath);
                            });
                    })
                    .then(function overrideFile() {
                        return _private.readRedirectsFile(options.path)
                            .then(function (content) {
                                validation.validateRedirects(content);
                                return fs.writeFile(redirectsPath, JSON.stringify(content), 'utf-8');
                            })
                            .then(function () {
                                // CASE: trigger that redirects are getting re-registered
                                customRedirectsMiddleware.reload();
                            });
                    });
            });
    }
};

module.exports = redirectsAPI;
