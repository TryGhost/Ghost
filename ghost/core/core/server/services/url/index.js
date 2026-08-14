const config = require('../../../shared/config');
const LocalFileCache = require('./local-file-cache');
const UrlService = require('./url-service');
const UrlServiceFacade = require('./url-service-facade');

// NOTE: instead of a path we could give UrlService a "data-resolver" of some sort
//       so it doesn't have to contain the logic to read data at all. This would be
//       a possible improvement in the future
let writeDisabled = false;
let storagePath = config.getContentPath('data');

// TODO: remove this hack in favor of loading from the content path when it's possible to do so
//       by mocking content folders in pre-boot phase
if (process.env.NODE_ENV.startsWith('test')){
    storagePath = config.get('paths').urlCache;

    // NOTE: prevents test suites from overwriting cache fixtures.
    //       A better solution would be injecting a different implementation of the
    //       cache based on the environment, this approach should do the trick for now
    writeDisabled = true;
}

const cache = new LocalFileCache({storagePath, writeDisabled});
const urlService = new UrlService({cache});

// Build a lazy backend alongside eager for shadow comparison, gated by the
// existing `lazyRouting` flag (unset by default = pure eager, unchanged).
// models is already loaded via url-service -> resources, so this require is safe.
let lazyUrlService = null;
let fetchRoutableResources = null;
if (config.get('lazyRouting')) {
    const LazyUrlService = require('./lazy-url-service');
    const {createFindResource} = require('./lazy-find-resource');
    const {createFetchRoutableResources} = require('./routable-resources');
    const models = require('../../models');
    lazyUrlService = new LazyUrlService({findResource: createFindResource(models)});
    fetchRoutableResources = createFetchRoutableResources({lazyUrlService});
}

const urlServiceFacade = lazyUrlService
    ? new UrlServiceFacade({urlService, lazyUrlService, compare: true, fetchRoutableResources})
    : new UrlServiceFacade({urlService});

// Singleton: default export remains the eager UrlService for backwards
// compatibility with existing imports. The new facade is exposed alongside
// it via `urlService.facade` so RouterManager and migrating callers can
// reach for it without forcing every consumer to update at once.
urlService.facade = urlServiceFacade;

module.exports = urlService;
