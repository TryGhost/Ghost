const {EventEmitter} = require('events');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

// Wire-format event types. Must match EVENT_TYPE_* in
// ghost/admin/app/services/presence.js (no shared module across the
// Node/Ember boundary).
const PRESENCE_EVENT_TYPES = Object.freeze({
    POST: 'post',
    SNAPSHOT: 'snapshot'
});

/**
 * @typedef {Object} PresenceUser
 * @property {string} id
 * @property {string} [name]
 * @property {string} [profileImage]
 */

/**
 * Internal record stored in `_byPostId`. `lastSeen` drives idle/TTL
 * sweeps and is not sent over the wire (see PresenceUserView).
 *
 * @typedef {Object} PresenceEntry
 * @property {string} id
 * @property {string} name
 * @property {string | null} profileImage
 * @property {number} lastSeen
 * @property {boolean} isIdle
 */

/**
 * Shape sent to clients (snapshot + post events). Mirrors PresenceEntry
 * without `lastSeen`.
 *
 * @typedef {Object} PresenceUserView
 * @property {string} id
 * @property {string} name
 * @property {string | null} profileImage
 * @property {boolean} isIdle
 */

/**
 * @typedef {Object} PresencePostEvent
 * @property {'post'} type
 * @property {string} postId
 * @property {PresenceUserView[]} users
 */

/**
 * @typedef {Object} PresenceSnapshotEvent
 * @property {'snapshot'} type
 * @property {Array<{postId: string, users: PresenceUserView[]}>} posts
 */

/**
 * Tracks which staff users currently have a given post open in the
 * editor. The post API marks the active user as a side effect of edit
 * heartbeats; an explicit POST signals editor entry; an explicit POST
 * (or pagehide beacon) signals leave. A periodic sweep transitions
 * entries through active → idle → removed so peers see stale tabs
 * fade and then disappear without polling.
 *
 * State is in-process. Ghost(Pro) runs one Node process per site.
 */
class PostPresenceService {
    /**
     * @param {Object} [opts]
     * @param {number} [opts.idleMs] entries older than this without
     *     activity are marked idle. Defaults to 90s — slightly above
     *     Ghost's 60s force-save cadence so an actively-open editor
     *     never flickers.
     * @param {number} [opts.ttlMs] entries older than this are removed.
     *     Must be greater than idleMs. Defaults to 180s.
     * @param {number} [opts.cleanupIntervalMs] sweep cadence. Defaults
     *     to ttlMs / 6 so transitions land within one sweep window.
     */
    constructor({idleMs = 90 * 1000, ttlMs = 180 * 1000, cleanupIntervalMs} = {}) {
        if (idleMs >= ttlMs) {
            throw new errors.IncorrectUsageError({
                message: 'PostPresenceService requires idleMs < ttlMs'
            });
        }
        this.idleMs = idleMs;
        this.ttlMs = ttlMs;
        this.cleanupIntervalMs = cleanupIntervalMs || Math.max(1000, Math.floor(ttlMs / 6));
        /** @type {Map<string, Map<string, PresenceEntry>>} */
        this._byPostId = new Map();
        /**
         * Per-post context (currently just the post's author IDs).
         * Carried alongside each event so the SSE handler can filter
         * by subscriber permission without an extra DB hop.
         * @type {Map<string, {authorIds: string[]}>}
         */
        this._postContexts = new Map();
        this._emitter = new EventEmitter();
        this._emitter.setMaxListeners(1000);
        this._cleanupTimer = null;
    }

    /**
     * @param {(event: PresencePostEvent) => void} handler
     */
    subscribe(handler) {
        this._emitter.on('presence', handler);
        return () => this._emitter.off('presence', handler);
    }

    start() {
        if (this._cleanupTimer) {
            return;
        }
        this._cleanupTimer = setInterval(() => this._cleanupAll(), this.cleanupIntervalMs);
        if (this._cleanupTimer.unref) {
            this._cleanupTimer.unref();
        }
    }

    stop() {
        if (this._cleanupTimer) {
            clearInterval(this._cleanupTimer);
            this._cleanupTimer = null;
        }
    }

    /**
     * Record that a user is active on a post. Publishes only when the
     * entry is new or transitioning from idle — already-active
     * heartbeats are silent on the bus so autosaves don't fan out N×M
     * events to every connected admin tab.
     *
     * `postContext.authorIds` is captured per post and carried on every
     * event for that post, so the SSE handler can filter what each
     * subscriber sees by their permission to read the post. Callers
     * (markPostPresence on the edit path, presence-enter) are expected
     * to pass it; if omitted we keep whatever was previously stored.
     *
     * @param {string} postId
     * @param {PresenceUser} user
     * @param {{authorIds?: string[]}} [postContext]
     */
    mark(postId, user, postContext) {
        if (!postId || !user || !user.id) {
            return;
        }
        if (!this._cleanupTimer) {
            this.start();
        }

        if (postContext && Array.isArray(postContext.authorIds)) {
            this._postContexts.set(postId, {authorIds: postContext.authorIds.slice()});
        }

        const now = Date.now();
        const entries = this._byPostId.get(postId) || new Map();
        const prev = entries.get(user.id);
        const wasActive = prev && !prev.isIdle && (now - prev.lastSeen) < this.ttlMs;

        entries.set(user.id, {
            id: user.id,
            name: user.name || '',
            profileImage: user.profileImage || null,
            lastSeen: now,
            isIdle: false
        });
        this._byPostId.set(postId, entries);

        if (!wasActive) {
            this._publish(postId, entries);
        }
    }

    /**
     * No-op if the user wasn't tracked, which keeps spurious beacons
     * from triggering fan-out.
     */
    leave(postId, userId) {
        if (!postId || !userId) {
            return;
        }
        const entries = this._byPostId.get(postId);
        if (!entries || !entries.has(userId)) {
            return;
        }
        entries.delete(userId);
        // Publish BEFORE dropping the postContext: subscribers who can
        // see this post need the "users: []" event to clear stale
        // avatars, and the filter depends on authorIds still being
        // available at emit time.
        this._publish(postId, entries);
        if (entries.size === 0) {
            this._byPostId.delete(postId);
            this._postContexts.delete(postId);
        }
    }

    /**
     * Filters stale entries on the way out. Each post carries its
     * authorIds so the SSE handler can filter the snapshot by the
     * subscriber's permission.
     *
     * @returns {Array<{postId: string, authorIds: string[], users: PresenceUserView[]}>}
     */
    snapshot() {
        const now = Date.now();
        const out = [];
        for (const [postId, entries] of this._byPostId.entries()) {
            const users = [];
            for (const entry of entries.values()) {
                if ((now - entry.lastSeen) < this.ttlMs) {
                    users.push(this._toWireUser(entry));
                }
            }
            if (users.length > 0) {
                out.push({postId, authorIds: this._authorIdsFor(postId), users});
            }
        }
        return out;
    }

    _authorIdsFor(postId) {
        const ctx = this._postContexts.get(postId);
        return ctx && Array.isArray(ctx.authorIds) ? ctx.authorIds.slice() : [];
    }

    /**
     * Strips `lastSeen` (internal sweep timestamp) from an entry before
     * it goes over the wire.
     *
     * @param {PresenceEntry} entry
     * @returns {PresenceUserView}
     */
    _toWireUser(entry) {
        return {
            id: entry.id,
            name: entry.name,
            profileImage: entry.profileImage,
            isIdle: Boolean(entry.isIdle)
        };
    }

    _publish(postId, entries) {
        const event = {
            type: PRESENCE_EVENT_TYPES.POST,
            postId,
            authorIds: this._authorIdsFor(postId),
            users: entries ? Array.from(entries.values()).map(entry => this._toWireUser(entry)) : []
        };
        try {
            this._emitter.emit('presence', event);
        } catch (err) {
            logging.warn({err, postId}, 'Presence subscriber threw during emit');
        }
    }

    /**
     * Each post is wrapped in try/catch so a single bad subscriber
     * doesn't abort the whole sweep.
     */
    _cleanupAll() {
        const now = Date.now();
        for (const [postId, entries] of this._byPostId.entries()) {
            try {
                const changed = this._sweep(entries, now);
                if (!changed) {
                    continue;
                }
                // Publish first (see leave() — authorIds must still be
                // populated at emit time so non-elevated subscribers
                // who had this post receive the clear).
                this._publish(postId, entries);
                if (entries.size === 0) {
                    this._byPostId.delete(postId);
                    this._postContexts.delete(postId);
                }
            } catch (err) {
                logging.warn({err, postId}, 'Presence cleanup iteration failed');
            }
        }
    }

    _sweep(entries, now) {
        let changed = false;
        for (const [id, entry] of entries) {
            if (!entry || typeof entry.lastSeen !== 'number') {
                entries.delete(id);
                changed = true;
                continue;
            }
            const age = now - entry.lastSeen;
            if (age >= this.ttlMs) {
                entries.delete(id);
                changed = true;
                continue;
            }
            const shouldBeIdle = age >= this.idleMs;
            if (Boolean(entry.isIdle) !== shouldBeIdle) {
                entries.set(id, {...entry, isIdle: shouldBeIdle});
                changed = true;
            }
        }
        return changed;
    }
}

module.exports = PostPresenceService;
module.exports.PRESENCE_EVENT_TYPES = PRESENCE_EVENT_TYPES;
