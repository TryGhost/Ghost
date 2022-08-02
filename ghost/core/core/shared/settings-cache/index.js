const CacheManager = require('./cache');
const publicSettings = require('./public');
const cache = {};

const cacheManager = new CacheManager({cache, publicSettings});

module.exports = cacheManager;
