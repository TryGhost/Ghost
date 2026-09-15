/**
 * Database-backed store for ATProto OAuth flow state rows.
 *
 * Rows live for OAUTH_STATE_TTL_MS.  A periodic cleanup sweep removes expired
 * rows (called from the service init). Rows are single-use: findAndConsume()
 * reads and deletes atomically so replayed state values are rejected.
 */
const crypto = require('node:crypto');

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const PENDING_EMAIL_TTL_MS = 15 * 60 * 1000; // 15 minutes

class OAuthStateStore {
    /** @param {import('knex').Knex} knex */
    constructor(knex) {
        this._knex = knex;
    }

    /**
     * Create a new OAuth state row and return its ID (the `state` parameter).
     * @returns {Promise<string>} state ID
     */
    async create({pkceVerifier, dpopPrivateKeyJwk, resolvedDid, pdsTokenEndpoint, asIssuer, redirectUrl}) {
        const id = crypto.randomBytes(32).toString('hex'); // 64 hex chars, 256-bit entropy
        const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS);

        await this._knex('atproto_oauth_states').insert({
            id,
            pkce_verifier: pkceVerifier,
            dpop_private_key_jwk: dpopPrivateKeyJwk,
            resolved_did: resolvedDid,
            pds_token_endpoint: pdsTokenEndpoint,
            as_issuer: asIssuer,
            redirect_url: redirectUrl || null,
            email_required: false,
            expires_at: expiresAt
        });

        return id;
    }

    /**
     * Find, validate, and atomically delete a state row.
     * Returns null if the row is missing or expired (both look identical to callers).
     * @param {string} id
     * @returns {Promise<Object|null>}
     */
    async findAndConsume(id) {
        return await this._knex.transaction(async (trx) => {
            const row = await trx('atproto_oauth_states').where({id}).first();

            if (!row) {
                return null;
            }

            // Always delete – including expired rows so they can't linger
            await trx('atproto_oauth_states').where({id}).delete();

            if (new Date(row.expires_at) < new Date()) {
                return null;
            }

            return {
                pkceVerifier: row.pkce_verifier,
                dpopPrivateKeyJwk: row.dpop_private_key_jwk,
                resolvedDid: row.resolved_did,
                pdsTokenEndpoint: row.pds_token_endpoint,
                asIssuer: row.as_issuer,
                redirectUrl: row.redirect_url,
                emailRequired: row.email_required
            };
        });
    }

    /** Remove all expired state rows (called periodically). */
    async deleteExpired() {
        await this._knex('atproto_oauth_states').where('expires_at', '<', new Date()).delete();
    }

    // -------------------------------------------------------------------------
    // Pending-email table: stores a verified DID until the user completes
    // email verification via a magic link.
    // -------------------------------------------------------------------------

    /**
     * Store a verified DID awaiting email confirmation.
     * @param {string} verifiedDid
     * @returns {Promise<string>} pending ID used in the email-required redirect
     */
    async createPendingEmail(verifiedDid) {
        const id = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + PENDING_EMAIL_TTL_MS);

        await this._knex('atproto_pending_email').insert({
            id,
            verified_did: verifiedDid,
            expires_at: expiresAt
        });

        return id;
    }

    /**
     * Find and atomically consume a pending-email row.
     * @param {string} id
     * @returns {Promise<string|null>} verified DID, or null if not found/expired
     */
    async consumePendingEmail(id) {
        return await this._knex.transaction(async (trx) => {
            const row = await trx('atproto_pending_email').where({id}).first();
            if (!row) {
                return null;
            }
            await trx('atproto_pending_email').where({id}).delete();
            if (new Date(row.expires_at) < new Date()) {
                return null;
            }
            return row.verified_did;
        });
    }

    /** Remove all expired pending-email rows. */
    async deleteExpiredPendingEmail() {
        await this._knex('atproto_pending_email').where('expires_at', '<', new Date()).delete();
    }
}

module.exports = OAuthStateStore;
