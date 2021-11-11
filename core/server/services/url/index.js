const path = require('path');
const config = require('../../../shared/config');
const UrlService = require('./UrlService');

// NOTE: instead of a path we could give UrlService a "data-resolver" of some sort
//       so it doesn't have to contain the logic to read data at all. This would be
//       a possible improvement in the future
const urlCachePath = path.join(config.getContentPath('data'), 'urls.json');
const urlService = new UrlService({urlCachePath});

// Singleton
module.exports = urlService;
