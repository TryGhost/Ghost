const CacheManager = require('./cache-manager');
const publicSettings = require('./public');

module.exports = function createSettingsCache() {
    return new CacheManager({publicSettings});
};
