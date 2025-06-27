const TinybirdService = require('./TinybirdService');
const logging = require('@tryghost/logging');

let instance = null;

function getInstance() {
    const config = require('../../../shared/config');
    const settingsCache = require('../../../shared/settings-cache');

    const tinybirdConfig = config.get('tinybird');
    const siteUuid = settingsCache.get('site_uuid');

    if (!tinybirdConfig || !siteUuid) {
        logging.warn('Tinybird service not configured');
        return null;
    }

    // Recreate instance if config has changed (useful for tests)
    if (config.get('env') === 'testing') {
        if (!instance || instance.tinybirdConfig !== tinybirdConfig) {
            instance = new TinybirdService({
                tinybirdConfig,
                siteUuid
            });
        }
    }

    return instance;
}

// Export a function that lazily gets the instance
module.exports = getInstance;