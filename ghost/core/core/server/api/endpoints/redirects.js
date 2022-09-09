const path = require('path');

const redirects = require('../../services/redirects');

module.exports = {
    docName: 'redirects',

    download: {
        headers: {
            disposition: {
                type: 'file',
                value() {
                    return redirects.api.getRedirectsFilePath()
                        .then((filePath) => {
                            // @deprecated: .json was deprecated in v4.0 but is still the default for backwards compat
                            return filePath === null || path.extname(filePath) === '.json'
                                ? 'redirects.json'
                                : 'redirects.yaml';
                        });
                }
            }
        },
        permissions: true,
        response: {
            async format() {
                const filePath = await redirects.api.getRedirectsFilePath();

                return filePath === null || path.extname(filePath) === '.json' ? 'json' : 'plain';
            }
        },
        query() {
            return redirects.api.get();
        }
    },

    upload: {
        permissions: true,
        headers: {
            cacheInvalidate: true
        },
        query(frame) {
            return redirects.api.setFromFilePath(frame.file.path, frame.file.ext);
        }
    }
};
