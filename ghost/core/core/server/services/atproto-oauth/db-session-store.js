/**
 * DB-backed session store for @atproto/oauth-client-node
 *
 * LINKEDTRUST FORK: This file is part of the AT Proto OAuth integration.
 * It implements the SimpleStore interface expected by NodeOAuthClient:
 *   get(key) -> value | undefined
 *   set(key, value) -> void
 *   del(key) -> void
 *
 * Sessions are stored as JSON in the members.atproto_session column,
 * keyed by DID (which is already unique on the members table).
 * This means sessions survive Ghost restarts — users who granted
 * write scope can post comments as themselves without re-authenticating.
 */

const logging = require('@tryghost/logging');

class DbSessionStore {
    constructor() {
        // Lazy-require to avoid circular deps at module load time
        this._models = null;
    }

    get models() {
        if (!this._models) {
            this._models = require('../../models');
        }
        return this._models;
    }

    /**
     * Get a session by DID (the key used by NodeOAuthClient)
     * @param {string} did
     * @returns {Promise<object|undefined>}
     */
    async get(did) {
        try {
            const member = await this.models.Member.findOne({atproto_did: did});
            if (!member) {
                return undefined;
            }
            const sessionJson = member.get('atproto_session');
            if (!sessionJson) {
                return undefined;
            }
            return JSON.parse(sessionJson);
        } catch (err) {
            logging.warn({message: `AT Proto session store: error reading session for ${did}`, err});
            return undefined;
        }
    }

    /**
     * Store a session for a DID
     * @param {string} did
     * @param {object} value - Session data (serializable)
     */
    async set(did, value) {
        try {
            const member = await this.models.Member.findOne({atproto_did: did});
            if (!member) {
                logging.warn(`AT Proto session store: no member found for DID ${did}, cannot store session`);
                return;
            }
            await this.models.Member.edit(
                {atproto_session: JSON.stringify(value)},
                {id: member.id}
            );
        } catch (err) {
            logging.error({message: `AT Proto session store: error writing session for ${did}`, err});
        }
    }

    /**
     * Delete a session for a DID
     * @param {string} did
     */
    async del(did) {
        try {
            const member = await this.models.Member.findOne({atproto_did: did});
            if (member) {
                await this.models.Member.edit(
                    {atproto_session: null},
                    {id: member.id}
                );
            }
        } catch (err) {
            logging.warn({message: `AT Proto session store: error deleting session for ${did}`, err});
        }
    }
}

module.exports = DbSessionStore;
