const config = require('../../../shared/config');
const logging = require('@tryghost/logging');
const LocalFileCache = require('./local-file-cache');
const UrlService = require('./url-service');
const LazyUrlService = require('./lazy/service');

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

const implementationConfig = config.get('urlService:implementation');
let implementation = implementationConfig || 'eager';

if (implementation !== 'eager' && implementation !== 'lazy') {
    logging.warn(`URL Service: unknown implementation "${implementationConfig}", falling back to eager`);
    implementation = 'eager';
}

let urlService;
if (implementation === 'lazy') {
    logging.info('URL Service: lazy implementation active (spike)');
    urlService = new LazyUrlService();
} else {
    const cache = new LocalFileCache({storagePath, writeDisabled});
    urlService = new UrlService({cache});
}

// Singleton
module.exports = urlService;
