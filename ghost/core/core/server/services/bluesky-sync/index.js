const logging = require('@tryghost/logging');
const settingsCache = require('../../../shared/settings-cache');

let syncService = null;

function isEnabled() {
    return settingsCache.get('bluesky_comment_sync_enabled') === true
        && !!settingsCache.get('bluesky_blog_handle');
}

function getBlogConfig() {
    return {
        handle: settingsCache.get('bluesky_blog_handle'),
        did: settingsCache.get('bluesky_blog_did'),
        appPassword: settingsCache.get('bluesky_blog_app_password')
    };
}

async function init() {
    if (!isEnabled()) {
        logging.info('Bluesky sync: disabled');
        return;
    }

    const BlueskySync = require('./sync');
    syncService = new BlueskySync(getBlogConfig());
    await syncService.start();
    logging.info('Bluesky sync: started');
}

function getSyncService() {
    return syncService;
}

module.exports = {
    isEnabled,
    getBlogConfig,
    getSyncService,
    init
};
