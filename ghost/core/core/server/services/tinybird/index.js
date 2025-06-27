const TinybirdService = require('./TinybirdService');
const logging = require('@tryghost/logging');

let instance = null;

function getInstance() {
    if (instance) {
        return instance;
    }

    const config = require('../../../shared/config');
    const settingsCache = require('../../../shared/settings-cache');

    const workspaceId = config.get('tinybird:workspaceId');
    const adminToken = config.get('tinybird:adminToken');
    const siteUuid = settingsCache.get('site_uuid');

    if (!workspaceId || !adminToken || !siteUuid) {
        logging.warn('Tinybird service not configured');
        return;
    }

    instance = new TinybirdService({
        workspaceId,
        adminToken,
        siteUuid
    });

    return instance;
}

module.exports = getInstance();