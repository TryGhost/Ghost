const logging = require('@tryghost/logging');
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');
const adapterManager = require('../adapter-manager');

const DynamicRedirectManager = require('../lib/dynamic-redirect-manager');
const {RedirectsService} = require('./redirects-service');
const validation = require('./validation');

let redirectsService;
let redirectManager;

const makeRedirectManager = () => new DynamicRedirectManager({
    permanentMaxAge: config.get('caching:customRedirects:maxAge'),
    getSubdirectoryURL: pathname => urlUtils.urlJoin(urlUtils.getSubdir(), pathname)
});

module.exports = {
    init() {
        redirectManager = makeRedirectManager();

        const store = adapterManager.getAdapter('redirects');
        logging.info(`[redirects] store selected: ${store.constructor.name}`);

        redirectsService = new RedirectsService({
            store,
            redirectManager,
            validate: validation.validate.bind(validation),
            createDryRunManager: makeRedirectManager
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
