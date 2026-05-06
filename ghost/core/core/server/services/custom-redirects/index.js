const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');

const DynamicRedirectManager = require('../lib/dynamic-redirect-manager');
const FileStore = require('./file-store');
const RedirectsService = require('./redirects-service');
const validation = require('./validation');

let redirectsService;
let redirectManager;

module.exports = {
    init() {
        redirectManager = new DynamicRedirectManager({
            permanentMaxAge: config.get('caching:customRedirects:maxAge'),
            getSubdirectoryURL: (pathname) => {
                return urlUtils.urlJoin(urlUtils.getSubdir(), pathname);
            }
        });

        const store = new FileStore({
            basePath: config.getContentPath('data')
        });

        redirectsService = new RedirectsService({
            store,
            redirectManager,
            validate: validation.validate.bind(validation)
        });

        return redirectsService.init();
    },

    get api() {
        return redirectsService;
    },

    get middleware() {
        return redirectManager.handleRequest;
    }
};
