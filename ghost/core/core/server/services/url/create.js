const LocalFileCache = require('./local-file-cache');
const UrlService = require('./url-service');
const UrlServiceFacade = require('./url-service-facade');

/**
 * @param {object} deps
 * @param {object} deps.siteConfig
 * @param {{get: (key: string) => unknown}} deps.deploymentConfig
 * @param {object} deps.models
 */
module.exports = function createUrlService({siteConfig, deploymentConfig, models}) {
    let writeDisabled = false;
    let storagePath = siteConfig.dataContentPath;

    // TODO: remove this hack in favor of loading from the content path when it's possible to do so
    //       by mocking content folders in pre-boot phase
    if (process.env.NODE_ENV.startsWith('test')) {
        storagePath = deploymentConfig.get('paths').urlCache;

        // NOTE: prevents test suites from overwriting cache fixtures.
        writeDisabled = true;
    }

    const cache = new LocalFileCache({storagePath, writeDisabled});
    const urlService = new UrlService({cache});

    // Lazy backend for shadow comparison, gated by the `lazyRouting` flag
    // (unset by default = pure eager, unchanged)
    let lazyUrlService = null;
    let fetchRoutableResources = null;
    if (deploymentConfig.get('lazyRouting')) {
        const LazyUrlService = require('./lazy-url-service');
        const {createFindResource} = require('./lazy-find-resource');
        const {createFetchRoutableResources} = require('./routable-resources');
        lazyUrlService = new LazyUrlService({findResource: createFindResource(models)});
        fetchRoutableResources = createFetchRoutableResources({lazyUrlService});
    }

    urlService.facade = lazyUrlService
        ? new UrlServiceFacade({urlService, lazyUrlService, compare: true, fetchRoutableResources})
        : new UrlServiceFacade({urlService});

    return urlService;
};
