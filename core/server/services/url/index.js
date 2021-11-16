const path = require('path');
const config = require('../../../shared/config');
const UrlService = require('./UrlService');

// NOTE: instead of a path we could give UrlService a "data-resolver" of some sort
//       so it doesn't have to contain the logic to read data at all. This would be
//       a possible improvement in the future
const urlsCachePath = path.join(config.getContentPath('data'), 'urls.json');
const resourcesCachePath = path.join(config.getContentPath('data'), 'resources.json');
const urlService = new UrlService({urlsCachePath, resourcesCachePath});

// Singleton
module.exports = urlService;
