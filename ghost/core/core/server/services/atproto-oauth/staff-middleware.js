const crypto = require('crypto');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const atprotoOAuth = require('./index');
const urlUtils = require('../../../shared/url-utils');

/**
 * Temporary token store for bridging OAuth callback to SSO adapter
 * Maps token -> { did, createdAt }
 * Tokens expire after 60 seconds (single-use, short-lived)
 */
const tempTokens = new Map();

// Cleanup expired tokens every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [token, data] of tempTokens) {
        if (now - data.createdAt > 60 * 1000) {
            tempTokens.delete(token);
        }
    }
}, 5 * 60 * 1000);

/**
 * Generate a short-lived temp token mapping to a DID
 * @param {string} did
 * @returns {string} token
 */
function createTempToken(did) {
    const token = crypto.randomBytes(32).toString('hex');
    tempTokens.set(token, {did, createdAt: Date.now()});
    return token;
}

/**
 * Consume a temp token and return the DID
 * @param {string} token
 * @returns {string|null} DID or null if expired/invalid
 */
function consumeTempToken(token) {
    const data = tempTokens.get(token);
    if (!data) {
        return null;
    }
    tempTokens.delete(token);

    // Check expiry (60 seconds)
    if (Date.now() - data.createdAt > 60 * 1000) {
        return null;
    }
    return data.did;
}

/**
 * POST /ghost/api/admin/atproto/authorize
 * Body: { handle: "alice.bsky.social" }
 * Returns: { url: "https://bsky.social/oauth/authorize?..." }
 */
async function authorize(req, res, next) {
    try {
        if (!atprotoOAuth.isEnabled()) {
            throw new errors.NotFoundError({message: 'AT Proto OAuth is not enabled'});
        }

        const {handle} = req.body;
        if (!handle || typeof handle !== 'string') {
            throw new errors.ValidationError({message: 'A valid Bluesky handle is required'});
        }

        if (!atprotoOAuth.initialized) {
            await atprotoOAuth.init();
        }

        const url = await atprotoOAuth.authorize(handle.trim());
        return res.json({url});
    } catch (err) {
        logging.error({message: 'AT Proto staff authorize error', err});
        return next(new errors.InternalServerError({
            message: err.message || 'Failed to initiate Bluesky login'
        }));
    }
}

/**
 * GET /ghost/api/admin/atproto/callback
 * PDS redirects here with code + state params
 * Creates temp token and redirects to Ghost admin with it
 * The SSO adapter picks up the token and creates the admin session
 */
async function callback(req, res, next) {
    try {
        if (!atprotoOAuth.isEnabled()) {
            throw new errors.NotFoundError({message: 'AT Proto OAuth is not enabled'});
        }

        const params = new URLSearchParams(req.query);
        const {did, handle} = await atprotoOAuth.handleCallback(params);

        // Generate short-lived token for SSO adapter
        const token = createTempToken(did);

        logging.info(`AT Proto OAuth: staff callback for ${handle} (${did}), issuing temp token`);

        // Redirect to Ghost admin with the token
        // The SSO adapter will pick this up via createSessionFromToken
        const adminUrl = urlUtils.urlFor('admin', true).replace(/\/$/, '');
        return res.redirect(`${adminUrl}/?atproto_token=${token}`);
    } catch (err) {
        logging.error({message: 'AT Proto staff callback error', err});
        const adminUrl = urlUtils.urlFor('admin', true).replace(/\/$/, '');
        return res.redirect(`${adminUrl}/#/signin?error=bluesky-auth-failed`);
    }
}

module.exports = {
    authorize,
    callback,
    consumeTempToken,
    createTempToken
};
