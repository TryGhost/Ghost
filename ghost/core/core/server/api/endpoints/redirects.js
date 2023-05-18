const path = require('path');

const customRedirects = require('../../services/custom-redirects');

module.exports = {
    docName: 'redirects',

    download: {
        headers: {
            disposition: {
                type: 'file',
                value() {
                    return customRedirects.api.getRedirectsFilePath()
                        .then((filePath) => {
                            // @deprecated: .json was deprecated in v4.0 but is still the default for backwards compat
                            return filePath === null || path.extname(filePath) === '.json'
                                ? 'redirects.json'
                                : 'redirects.yaml';
                        });
                }
            },
            cacheInvalidate: false
        },
        permissions: true,
        response: {
            async format() {
                const filePath = await customRedirects.api.getRedirectsFilePath();

                return filePath === null || path.extname(filePath) === '.json' ? 'json' : 'plain';
            }
        },
        query() {
            return customRedirects.api.get();
        }
    },

    upload: {
        permissions: true,
        headers: {
            cacheInvalidate: true
        },
        query(frame) {
            return customRedirects.api.setFromFilePath(frame.file.path, frame.file.ext);
        }
    }
};
