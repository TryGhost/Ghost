const logging = require('@tryghost/logging');

/**
 * AT Protocol OAuth Client
 * Adapted from ghost-atproto bridge (bluesky-oauth.ts)
 * Uses @atproto/oauth-client-node for OAuth 2.1 + DPoP + PKCE
 */

let NodeOAuthClient;
let SimpleStoreMemory;
let BskyAgent;

let oauthClient = null;

/**
 * Lazy-load AT Proto dependencies (they're ESM-only)
 */
async function loadDeps() {
    if (!NodeOAuthClient) {
        const oauthMod = await import('@atproto/oauth-client-node');
        NodeOAuthClient = oauthMod.NodeOAuthClient;

        const storeMod = await import('@atproto-labs/simple-store-memory');
        SimpleStoreMemory = storeMod.SimpleStoreMemory;

        const apiMod = await import('@atproto/api');
        BskyAgent = apiMod.BskyAgent;
    }
}

/**
 * Initialize the AT Proto OAuth client
 * @param {object} options
 * @param {string} options.siteUrl - Ghost site URL (must be HTTPS in production)
 * @param {string} options.clientName - Display name for the OAuth client
 * @param {string} options.memberRedirectUri - Callback URL for member auth
 * @param {string} options.staffRedirectUri - Callback URL for staff auth
 * @returns {Promise<object|null>} The OAuth client, or null if setup fails
 */
async function setupClient({siteUrl, clientName, memberRedirectUri, staffRedirectUri}) {
    try {
        await loadDeps();

        const clientId = `${siteUrl}/members/api/atproto/client-metadata.json`;

        const stateStore = new SimpleStoreMemory({
            max: 100,
            ttl: 10 * 60 * 1000, // 10 minutes
            ttlAutopurge: true
        });
        const sessionStore = new SimpleStoreMemory({max: 100});

        oauthClient = new NodeOAuthClient({
            clientMetadata: {
                client_id: clientId,
                client_name: clientName || 'Ghost Blog',
                client_uri: siteUrl,
                redirect_uris: [memberRedirectUri, staffRedirectUri],
                scope: 'atproto transition:generic',
                grant_types: ['authorization_code', 'refresh_token'],
                response_types: ['code'],
                token_endpoint_auth_method: 'none',
                application_type: 'web',
                dpop_bound_access_tokens: true
            },
            stateStore,
            sessionStore
        });

        logging.info('AT Proto OAuth client initialized');
        return oauthClient;
    } catch (error) {
        logging.error({message: 'Failed to setup AT Proto OAuth client', err: error});
        return null;
    }
}

/**
 * Get the initialized OAuth client
 * @returns {object|null}
 */
function getClient() {
    return oauthClient;
}

/**
 * Generate the client metadata JSON for AT Proto PDSes to fetch
 * @param {object} options
 * @param {string} options.siteUrl
 * @param {string} options.clientName
 * @param {string} options.memberRedirectUri
 * @param {string} options.staffRedirectUri
 * @returns {object}
 */
function getClientMetadata({siteUrl, clientName, memberRedirectUri, staffRedirectUri}) {
    return {
        client_id: `${siteUrl}/members/api/atproto/client-metadata.json`,
        client_name: clientName || 'Ghost Blog',
        client_uri: siteUrl,
        redirect_uris: [memberRedirectUri, staffRedirectUri],
        scope: 'atproto transition:generic',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
        application_type: 'web',
        dpop_bound_access_tokens: true
    };
}

/**
 * Start OAuth authorization flow
 * @param {string} handle - Bluesky handle (e.g. alice.bsky.social)
 * @returns {Promise<string>} Authorization URL to redirect user to
 */
async function authorize(handle) {
    if (!oauthClient) {
        throw new Error('AT Proto OAuth client not initialized');
    }

    const url = await oauthClient.authorize(handle, {
        scope: 'atproto'
    });

    logging.info(`AT Proto OAuth: generated auth URL for ${handle}`);
    return url.toString();
}

/**
 * Handle OAuth callback from PDS
 * @param {URLSearchParams} params - Callback query parameters
 * @returns {Promise<{did: string, handle: string, displayName: string, avatarUrl: string|null}>}
 */
async function handleCallback(params) {
    if (!oauthClient) {
        throw new Error('AT Proto OAuth client not initialized');
    }

    await loadDeps();

    const {session} = await oauthClient.callback(params);
    const did = session.did;

    // Get profile data from Bluesky
    const agent = new BskyAgent({service: 'https://public.api.bsky.app'});
    const profile = await agent.getProfile({actor: did});

    const handle = profile.data.handle;
    const displayName = profile.data.displayName || handle;
    const avatarUrl = profile.data.avatar || null;

    logging.info(`AT Proto OAuth: callback success for ${handle} (${did})`);

    return {did, handle, displayName, avatarUrl};
}

module.exports = {
    setupClient,
    getClient,
    getClientMetadata,
    authorize,
    handleCallback
};
