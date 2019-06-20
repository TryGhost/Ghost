const fs = require('fs-extra');
const path = require('path');
const moment = require('moment-timezone');
const config = require('../../config');
const validation = require('../../data/validation');
const web = require('../../web');
const redirects = require('../../../frontend/services/redirects');

const _private = {};

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
            return redirects.handler.readRedirectsFile();
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
                    return redirects.handler.readRedirectsFile(frame.file.path)
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
