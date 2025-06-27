const TinybirdService = require('./TinybirdService');
const logging = require('@tryghost/logging');

let instance = null;

function getInstance() {
    if (instance) {
        return instance;
    }

    const config = require('../../../shared/config');
    const settingsCache = require('../../../shared/settings-cache');

    const tinybirdConfig = config.get('tinybird');
    const siteUuid = settingsCache.get('site_uuid');

    if (!tinybirdConfig.workspaceId || !tinybirdConfig.adminToken || !siteUuid) {
        logging.warn('Tinybird service not configured');
        return;
    }

    instance = new TinybirdService({
        tinybirdConfig,
        siteUuid
    });

    return instance;
}

module.exports = getInstance();