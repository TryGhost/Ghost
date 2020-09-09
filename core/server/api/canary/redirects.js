const path = require('path');

const web = require('../../web');
const redirects = require('../../../frontend/services/redirects');

module.exports = {
    docName: 'redirects',

    download: {
        headers: {
            disposition: {
                type: 'file',
                value() {
                    return redirects.settings.getCurrentRedirectsFilePath()
                        .then((filePath) => {
                            return path.extname(filePath) === '.yaml'
                                ? 'redirects.yaml'
                                : 'redirects.json';
                        });
                }
            }
        },
        permissions: true,
        response: {
            format: 'plain'
        },
        query() {
            return redirects.settings.get();
        }
    },

    upload: {
        permissions: true,
        headers: {
            cacheInvalidate: true
        },
        query(frame) {
            return redirects.settings.setFromFilePath(frame.file.path, frame.file.ext)
                .then(() => {
                    // CASE: trigger that redirects are getting re-registered
                    web.shared.middlewares.customRedirects.reload();
                });
        }
    }
};
