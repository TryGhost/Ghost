const CacheManager = require('./cache-manager');
const publicSettings = require('./public');

const cacheManager = new CacheManager({publicSettings});

module.exports = cacheManager;
