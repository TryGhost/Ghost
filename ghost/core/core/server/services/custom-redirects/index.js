const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');

const DynamicRedirectManager = require('@tryghost/express-dynamic-redirects');
const CustomRedirectsAPI = require('./CustomRedirectsAPI');
const validation = require('./validation');
const {getBackupRedirectsFilePath} = require('./utils');

let customRedirectsAPI;
let redirectManager;

module.exports = {
    init() {
        redirectManager = new DynamicRedirectManager({
            permanentMaxAge: config.get('caching:customRedirects:maxAge'),
            getSubdirectoryURL: (pathname) => {
                return urlUtils.urlJoin(urlUtils.getSubdir(), pathname);
            }
        });

        customRedirectsAPI = new CustomRedirectsAPI({
            basePath: config.getContentPath('data'),
            redirectManager,
            getBackupFilePath: getBackupRedirectsFilePath,
            validate: validation.validate.bind(validation)
        });

        return customRedirectsAPI.init();
    },

    get api() {
        return customRedirectsAPI;
    },

    get middleware() {
        return redirectManager.handleRequest;
    }
};
