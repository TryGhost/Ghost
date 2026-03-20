const logging = require('@tryghost/logging');

/**
 * AT Protocol OAuth Client
 * Adapted from ghost-atproto bridge (bluesky-oauth.ts)
 * Uses @atproto/oauth-client-node for OAuth 2.1 + DPoP + PKCE
 */

const DbSessionStore = require('./db-session-store');

let NodeOAuthClient;
let SimpleStoreMemory;
let BskyAgent;
let Agent;

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
        Agent = apiMod.Agent;
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

        // State store is short-lived (10min TTL for in-progress auth flows), memory is fine
        const stateStore = new SimpleStoreMemory({
            max: 100,
            ttl: 10 * 60 * 1000, // 10 minutes
            ttlAutopurge: true
        });
        // Session store is DB-backed so sessions survive Ghost restarts
        // LINKEDTRUST FORK: see db-session-store.js
        const sessionStore = new DbSessionStore();

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
async function authorize(handle, {scope = 'atproto', prompt} = {}) {
    if (!oauthClient) {
        throw new Error('AT Proto OAuth client not initialized');
    }

    const opts = {scope};
    if (prompt) {
        opts.prompt = prompt;
    }

    const url = await oauthClient.authorize(handle, opts);

    logging.info(`AT Proto OAuth: generated auth URL for ${handle} (scope: ${scope})`);
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

    const callbackResult = await oauthClient.callback(params);
    const session = callbackResult.session;
    const did = session.sub;

    // Get scope from token info (not on session surface)
    let scope = 'atproto';
    try {
        const tokenInfo = await session.getTokenInfo();
        logging.info(`AT Proto OAuth: tokenInfo: ${JSON.stringify({scope: tokenInfo.scope, iss: tokenInfo.iss, aud: tokenInfo.aud, sub: tokenInfo.sub})}`);
        scope = tokenInfo.scope || 'atproto';
    } catch (err) {
        logging.warn({message: 'AT Proto OAuth: could not get token info', err});
    }

    // Get profile data from Bluesky
    const agent = new BskyAgent({service: 'https://public.api.bsky.app'});
    const profile = await agent.getProfile({actor: did});

    const handle = profile.data.handle;
    const displayName = profile.data.displayName || handle;
    const avatarUrl = profile.data.avatar || null;

    logging.info(`AT Proto OAuth: callback success for ${handle} (${did}), scope: ${scope}`);

    return {did, handle, displayName, avatarUrl, scope};
}

/**
 * Restore an authenticated session for a given DID
 * Returns an agent that can post on behalf of the user, or null
 * @param {string} did
 * @returns {Promise<object|null>} BskyAgent or null
 */
async function restoreSession(did) {
    if (!oauthClient) {
        // OAuth client not yet initialized — try to init it now
        logging.info(`AT Proto OAuth: restoreSession initializing client on demand`);
        const index = require('./index');
        if (index.isEnabled() && !index.initialized) {
            await index.init();
        }
        if (!oauthClient) {
            logging.warn(`AT Proto OAuth: restoreSession failed — could not initialize client`);
            return null;
        }
    }
    try {
        await loadDeps();
        const oauthSession = await oauthClient.restore(did);
        if (!oauthSession) {
            logging.warn(`AT Proto OAuth: restoreSession for ${did} returned null`);
            return null;
        }
        // OAuthSession implements SessionManager: has .sub (did) and .fetchHandler
        // which resolves relative URLs against the PDS, adds DPoP + auth headers,
        // and handles token refresh automatically
        const agent = new Agent(oauthSession);
        logging.info(`AT Proto OAuth: restored session for ${did}`);
        return agent;
    } catch (err) {
        logging.warn({message: `AT Proto OAuth: could not restore session for ${did}`, err});
        return null;
    }
}

/**
 * Revoke an existing OAuth session for a DID
 * Used before scope upgrade so the PDS issues a fresh grant
 * @param {string} did
 * @returns {Promise<boolean>}
 */
async function revokeSession(did) {
    if (!oauthClient) {
        return false;
    }
    try {
        const session = await oauthClient.restore(did);
        if (session && typeof session.signOut === 'function') {
            await session.signOut();
            logging.info(`AT Proto OAuth: revoked session for ${did}`);
        }
        return true;
    } catch (err) {
        logging.warn({message: `AT Proto OAuth: could not revoke session for ${did}`, err});
        return false;
    }
}

module.exports = {
    setupClient,
    getClient,
    getClientMetadata,
    authorize,
    handleCallback,
    restoreSession,
    revokeSession
};
