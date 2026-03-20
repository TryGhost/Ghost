const client = require('./client');
const settingsCache = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils');
const logging = require('@tryghost/logging');

let initialized = false;

/**
 * Check if AT Proto OAuth is enabled in settings
 * @returns {boolean}
 */
function isEnabled() {
    return settingsCache.get('atproto_oauth_enabled') === true;
}

/**
 * Get the site URL and derived URIs
 * @returns {object}
 */
function getConfig() {
    const siteUrl = urlUtils.getSiteUrl().replace(/\/$/, '');
    const clientName = settingsCache.get('atproto_client_name') || settingsCache.get('title') || 'Ghost Blog';

    return {
        siteUrl,
        clientName,
        memberRedirectUri: `${siteUrl}/members/api/atproto/callback`,
        staffRedirectUri: `${siteUrl}/ghost/api/admin/atproto/callback`
    };
}

/**
 * Initialize the AT Proto OAuth service
 * Called during Ghost boot if enabled
 */
async function init() {
    if (!isEnabled()) {
        logging.info('AT Proto OAuth: disabled in settings');
        return;
    }

    const config = getConfig();

    const oauthClient = await client.setupClient(config);
    if (oauthClient) {
        initialized = true;
        logging.info('AT Proto OAuth: service initialized');
    }
}

module.exports = {
    isEnabled,
    getConfig,
    getClient: client.getClient,
    getClientMetadata: client.getClientMetadata,
    authorize: client.authorize,
    handleCallback: client.handleCallback,
    restoreSession: client.restoreSession,
    revokeSession: client.revokeSession,
    init,
    get initialized() {
        return initialized;
    }
};
