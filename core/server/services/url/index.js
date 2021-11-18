const config = require('../../../shared/config');
const LocalFileCache = require('./LocalFileCache');
const UrlService = require('./UrlService');

// NOTE: instead of a path we could give UrlService a "data-resolver" of some sort
//       so it doesn't have to contain the logic to read data at all. This would be
//       a possible improvement in the future

let storagePath = config.getContentPath('data');

// TODO: remove this hack in favor of loading from the content path when it's possible to do so
//       by mocking content folders in pre-boot phase
if (process.env.NODE_ENV.match(/^testing/)){
    storagePath = config.get('paths').urlCache;
}

const cache = new LocalFileCache({storagePath});
const urlService = new UrlService({cache});

// Singleton
module.exports = urlService;
