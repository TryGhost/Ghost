const localUtils = require('./utils'),
    web = require('../../web'),
    redirects = require('../../../frontend/services/redirects');

let redirectsAPI;

redirectsAPI = {
    download(options) {
        return localUtils.handlePermissions('redirects', 'download')(options)
            .then(() => {
                return redirects.settings.get();
            });
    },
    upload(options) {
        return localUtils.handlePermissions('redirects', 'upload')(options)
            .then(() => redirects.settings.setFromFilePath(options.path))
            .then(() => {
                // CASE: trigger that redirects are getting re-registered
                web.shared.middlewares.customRedirects.reload();
            });
    }
};

module.exports = redirectsAPI;
