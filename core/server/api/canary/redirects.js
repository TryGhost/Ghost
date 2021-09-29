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
                            // TODO: Default file type is .json for backward compatibility.
                            // When .yaml becomes default or .json is removed at v4,
                            // This part should be changed.
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
