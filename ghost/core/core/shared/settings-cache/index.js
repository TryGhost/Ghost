const CacheManager = require('./CacheManager');
const publicSettings = require('./public');

const cacheManager = new CacheManager({publicSettings});

module.exports = cacheManager;
