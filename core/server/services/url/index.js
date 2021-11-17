const path = require('path');
const config = require('../../../shared/config');
const UrlService = require('./UrlService');

// NOTE: instead of a path we could give UrlService a "data-resolver" of some sort
//       so it doesn't have to contain the logic to read data at all. This would be
//       a possible improvement in the future

let urlsCachePath = path.join(config.getContentPath('data'), 'urls.json');
let resourcesCachePath = path.join(config.getContentPath('data'), 'resources.json');

// TODO: remove this hack in favor of loading from the content path when it's possible to do so
//       by mocking content folders in pre-boot phase
if (process.env.NODE_ENV.match(/^testing/)){
    urlsCachePath = path.join(config.get('paths').urlCache, 'urls.json');
    resourcesCachePath = path.join(config.get('paths').urlCache, 'resources.json');
}

const urlService = new UrlService({urlsCachePath, resourcesCachePath});

// Singleton
module.exports = urlService;
