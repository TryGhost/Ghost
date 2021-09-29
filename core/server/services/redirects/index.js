const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');

const DynamicRedirectManager = require('@tryghost/express-dynamic-redirects');
const CustomRedirectsAPI = require('./api');

const redirectManager = new DynamicRedirectManager({
    permanentMaxAge: config.get('caching:customRedirects:maxAge')
}, urlUtils);

const customRedirectsAPI = new CustomRedirectsAPI({
    basePath: config.getContentPath('data')
}, redirectManager);

module.exports = {
    init() {
        return customRedirectsAPI.init();
    },

    api: customRedirectsAPI,

    middleware: redirectManager.handleRequest
};
