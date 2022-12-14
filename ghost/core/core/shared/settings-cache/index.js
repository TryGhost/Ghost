const CacheManager = require('./cache');
const publicSettings = require('./public');

const cacheManager = new CacheManager({publicSettings});

module.exports = cacheManager;
