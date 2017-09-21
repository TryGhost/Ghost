'use strict';

const fs = require('fs'),
    Promise = require('bluebird'),
    path = require('path'),
    config = require('../config'),
    errors = require('../errors'),
    i18n = require('../i18n'),
    globalUtils = require('../utils'),
    apiUtils = require('./utils'),
    customRedirectsMiddleware = require('../middleware/custom-redirects');

let redirectsAPI,
    _private = {};

_private.readRedirectsFile = function readRedirectsFile(customRedirectsPath) {
    let redirectsPath = customRedirectsPath || path.join(config.getContentPath('data'), 'redirects.json');

    return Promise.promisify(fs.readFile)(redirectsPath, 'utf-8')
        .then(function serveContent(content) {
            try {
                content = JSON.parse(content);
            } catch (err) {
                throw new errors.BadRequestError({
                    message: i18n.t('errors.general.jsonParse', {context: err.message})
                });
            }

            return content;
        })
        .catch(function handleError(err) {
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

redirectsAPI = {
    download: function download(options) {
        return apiUtils.handlePermissions('redirects', 'download')(options)
            .then(function () {
                return _private.readRedirectsFile();
            });
    },
    upload: function upload(options) {
        let redirectsPath = path.join(config.getContentPath('data'), 'redirects.json');

        return apiUtils.handlePermissions('redirects', 'upload')(options)
            .then(function () {
                return Promise.promisify(fs.unlink)(redirectsPath)
                    .catch(function handleError(err) {
                        // CASE: ignore file not found
                        if (err.code === 'ENOENT') {
                            return Promise.resolve();
                        }

                        throw err;
                    })
                    .finally(function overrideFile() {
                        return _private.readRedirectsFile(options.path)
                            .then(function (content) {
                                globalUtils.validateRedirects(content);
                                return Promise.promisify(fs.writeFile)(redirectsPath, JSON.stringify(content), 'utf-8');
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
