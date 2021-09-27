const web = require('../../web');
const redirects = require('../../services/redirects');

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
            return redirects.api.get();
        }
    },

    upload: {
        permissions: true,
        headers: {
            cacheInvalidate: true
        },
        query(frame) {
            return redirects.api.setFromFilePath(frame.file.path)
                .then(() => {
                    // CASE: trigger that redirects are getting re-registered
                    web.shared.middlewares.customRedirects.reload();
                });
        }
    }
};
