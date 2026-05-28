const {EventEmitter} = require('events');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

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
 * @typedef {Object} PresenceEntry
 * @property {string} id
 * @property {string} name
 * @property {string | null} profileImage
 * @property {number} lastSeen
 * @property {boolean} isIdle
 */

/**
 * @typedef {Object} PresencePostEvent
 * @property {'post'} type
 * @property {string} postId
 * @property {PresenceEntry[]} users
 */

/**
 * Tracks which staff users currently have a given post open in the
 * editor. The post API marks the active user as a side effect of edit
 * heartbeats; an explicit POST signals editor entry; an explicit POST
 * (or pagehide beacon) signals leave. A periodic sweep transitions
 * entries through active → idle → removed so peers see stale tabs
 * fade and then disappear without polling.
 *
 * State is in-process. Ghost(Pro) runs one Node process per site;
 * see EDITOR-PRESENCE.md for the deployment context that makes this
 * sufficient.
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
        this._emitter = new EventEmitter();
        this._emitter.setMaxListeners(1000);
        this._cleanupTimer = null;
    }

    /**
     * Subscribe to presence events. Returns an unsubscribe function.
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
     * @param {string} postId
     * @param {PresenceUser} user
     */
    mark(postId, user) {
        if (!postId || !user || !user.id) {
            return;
        }
        if (!this._cleanupTimer) {
            this.start();
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
     * Remove a user from a post and publish the new list. No-op if the
     * user wasn't tracked, which keeps spurious beacons from triggering
     * fan-out.
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
        if (entries.size === 0) {
            this._byPostId.delete(postId);
        }
        this._publish(postId, entries);
    }

    /**
     * Active posts and their users. Used by the SSE handler to send
     * initial state to a freshly-connected admin tab. Filters stale
     * entries on the way out.
     *
     * @returns {Array<{postId: string, users: PresenceEntry[]}>}
     */
    snapshot() {
        const now = Date.now();
        const out = [];
        for (const [postId, entries] of this._byPostId.entries()) {
            const users = [];
            for (const entry of entries.values()) {
                if ((now - entry.lastSeen) < this.ttlMs) {
                    users.push(entry);
                }
            }
            if (users.length > 0) {
                out.push({postId, users});
            }
        }
        return out;
    }

    _publish(postId, entries) {
        const event = {
            type: PRESENCE_EVENT_TYPES.POST,
            postId,
            users: entries ? Array.from(entries.values()) : []
        };
        try {
            this._emitter.emit('presence', event);
        } catch (err) {
            logging.warn({err}, 'Presence subscriber threw during emit');
        }
    }

    /**
     * Sweep all posts: transition entries past idleMs to isIdle, drop
     * entries past ttlMs, and publish per-post when state changed.
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
                if (entries.size === 0) {
                    this._byPostId.delete(postId);
                }
                this._publish(postId, entries);
            } catch (err) {
                logging.warn({err, postId}, 'Presence cleanup iteration failed');
            }
        }
    }

    /**
     * Mutates the entries map in place. Returns true if anything
     * changed.
     */
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
