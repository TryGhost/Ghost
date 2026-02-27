const Base = require('./SSOBase');
const models = require('../../models');
const logging = require('@tryghost/logging');

/**
 * SSO Adapter for AT Protocol (Bluesky) staff authentication.
 *
 * This adapter bridges the AT Proto OAuth callback to Ghost's admin session system.
 * It looks for a `atproto_token` query parameter that was set by the staff OAuth callback,
 * consumes the short-lived temp token to get the DID, and finds the matching staff user.
 *
 * Falls through gracefully (returns null) when AT Proto OAuth is not enabled or
 * when no atproto_token is present, allowing normal login flows to proceed.
 */
module.exports = class ATProtoSSOAdapter extends Base {
    constructor() {
        super();
    }

    /**
     * Extract the AT Proto temp token from the request
     * @param {import('express').Request} req
     * @returns {Promise<string|null>} The temp token, or null
     */
    async getRequestCredentials(req) {
        const token = req.query?.atproto_token || null;
        return token;
    }

    /**
     * Validate the temp token and return the DID (identity lookup key)
     * @param {string} token - The temp token from the OAuth callback
     * @returns {Promise<string|null>} The DID, or null if token is invalid/expired
     */
    async getIdentityFromCredentials(token) {
        if (!token) {
            return null;
        }

        try {
            // Lazy-require to avoid circular dependency at module load time
            const staffMiddleware = require('../../services/atproto-oauth/staff-middleware');
            const did = staffMiddleware.consumeTempToken(token);

            if (!did) {
                logging.warn('AT Proto SSO: invalid or expired temp token');
                return null;
            }

            logging.info(`AT Proto SSO: resolved token to DID ${did}`);
            return did;
        } catch (err) {
            logging.error({message: 'AT Proto SSO: error consuming token', err});
            return null;
        }
    }

    /**
     * Find the Ghost staff user by their Bluesky DID
     * @param {string} did - The AT Proto DID
     * @returns {Promise<object|null>} The user model, or null
     */
    async getUserForIdentity(did) {
        if (!did) {
            return null;
        }

        try {
            const user = await models.User.findOne({bluesky_did: did, status: 'active'});

            if (!user) {
                logging.warn(`AT Proto SSO: no active staff user found for DID ${did}`);
                return null;
            }

            logging.info(`AT Proto SSO: authenticated staff user ${user.get('email')} via DID ${did}`);
            return user;
        } catch (err) {
            logging.error({message: 'AT Proto SSO: error finding user', err});
            return null;
        }
    }
};
