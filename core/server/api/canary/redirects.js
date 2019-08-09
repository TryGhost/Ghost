const web = require('../../web');
const redirects = require('../../../frontend/services/redirects');

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
            return redirects.settings.get();
        }
    },

    upload: {
        permissions: true,
        headers: {
            cacheInvalidate: true
        },
        query(frame) {
            return redirects.settings.setFromFilePath(frame.file.path)
                .then(() => {
                    // CASE: trigger that redirects are getting re-registered
                    web.shared.middlewares.customRedirects.reload();
                });
        }
    }
};
