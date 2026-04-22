const TinybirdService = require('./tinybird-service');

module.exports = class TinybirdServiceWrapper {
    /** @type TinybirdService */
    static instance;

    static init() {
        const config = require('../../../shared/config');
        const settingsCache = require('../../../shared/settings-cache');
        const logging = require('@tryghost/logging');

        const tinybirdConfig = config.get('tinybird');
        const siteUuid = settingsCache.get('site_uuid');

        if (!tinybirdConfig || !siteUuid) {
            logging.warn('Tinybird service not configured');
            TinybirdServiceWrapper.instance = null;
            return;
        }

        // Create instance with valid config
        TinybirdServiceWrapper.instance = new TinybirdService({
            tinybirdConfig,
            siteUuid
        });
    }

    // Reset the instance for testing
    static reset() {
        TinybirdServiceWrapper.instance = null;
    }
};
