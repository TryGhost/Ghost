const TinybirdService = require('./TinybirdService');
const errors = require('@tryghost/errors');

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
        throw new errors.IncorrectUsageError({
            message: 'Tinybird service not configured properly'
        });
    }

    instance = new TinybirdService({
        workspaceId,
        adminToken,
        siteUuid
    });

    return instance;
}

module.exports = getInstance();