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
const urlServiceFacade = new UrlServiceFacade({urlService});

// Singleton: default export remains the eager UrlService for backwards
// compatibility with existing imports. The new facade is exposed alongside
// it via `urlService.facade` so RouterManager and migrating callers can
// reach for it without forcing every consumer to update at once.
urlService.facade = urlServiceFacade;

module.exports = urlService;
