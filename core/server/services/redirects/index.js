const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');

const DynamicRedirectManager = require('@tryghost/express-dynamic-redirects');
const CustomRedirectsAPI = require('./api');

const redirectManager = new DynamicRedirectManager({
    permanentMaxAge: config.get('caching:customRedirects:maxAge'),
    getSubdirectoryURL: (pathname) => {
        return urlUtils.urlJoin(urlUtils.getSubdir(), pathname);
    }
});

let customRedirectsAPI;

module.exports = {
    init() {
        customRedirectsAPI = new CustomRedirectsAPI({
            basePath: config.getContentPath('data')
        }, redirectManager);

        return customRedirectsAPI.init();
    },

    get api() {
        return customRedirectsAPI;
    },

    middleware: redirectManager.handleRequest
};
