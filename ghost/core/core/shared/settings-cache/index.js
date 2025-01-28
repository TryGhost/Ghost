const CacheManager = require('./CacheManager');
const publicSettings = require('./public');
const config = require('../config');

const cacheManager = new CacheManager({publicSettings, settingsOverrides: config.get('hostSettings:settingsOverrides')});

module.exports = cacheManager;
