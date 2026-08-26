import { EventEmitter } from 'events';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';

// Wire-format event types. Must match EVENT_TYPE_* in
// apps/ember-admin/app/services/presence.js (no shared module across the
// Node/Ember boundary).
export const PRESENCE_EVENT_TYPES = Object.freeze({
  POST: 'post',
  SNAPSHOT: 'snapshot',
});

export type PresenceUser = {
  id: string;
  name?: string;
  profileImage?: string | null;
};

/** Internal record. `lastSeen` drives idle/TTL sweeps and is not sent over the wire. */
export type PresenceEntry = {
  id: string;
  name: string;
  profileImage: string | null;
  lastSeen: number;
  isIdle: boolean;
};

/** Shape sent to clients (snapshot + post events). */
export type PresenceUserView = {
  id: string;
  name: string;
  profileImage: string | null;
  isIdle: boolean;
};

export type PresencePostContext = {
  authorIds: string[];
};

export type PresencePostEvent = {
  type: typeof PRESENCE_EVENT_TYPES.POST;
  postId: string;
  authorIds: string[];
  users: PresenceUserView[];
};

export type PresenceSnapshotPost = {
  postId: string;
  authorIds: string[];
  users: PresenceUserView[];
};

export type PresenceSnapshotEvent = {
  type: typeof PRESENCE_EVENT_TYPES.SNAPSHOT;
  posts: PresenceSnapshotPost[];
};

export type PostPresenceServiceOptions = {
  idleMs?: number;
  ttlMs?: number;
  cleanupIntervalMs?: number;
};

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
export class PostPresenceService {
  idleMs: number;
  ttlMs: number;
  cleanupIntervalMs: number;
  _byPostId: Map<string, Map<string, PresenceEntry>>;
  _postContexts: Map<string, PresencePostContext>;
  _emitter: EventEmitter;
  _cleanupTimer: NodeJS.Timeout | null;

  constructor({
    idleMs = 90 * 1000,
    ttlMs = 180 * 1000,
    cleanupIntervalMs,
  }: PostPresenceServiceOptions = {}) {
    if (idleMs >= ttlMs) {
      throw new errors.IncorrectUsageError({
        message: 'PostPresenceService requires idleMs < ttlMs',
      });
    }
    this.idleMs = idleMs;
    this.ttlMs = ttlMs;
    this.cleanupIntervalMs = cleanupIntervalMs || Math.max(1000, Math.floor(ttlMs / 6));
    this._byPostId = new Map();
    this._postContexts = new Map();
    this._emitter = new EventEmitter();
    this._emitter.setMaxListeners(1000);
    this._cleanupTimer = null;
  }

  subscribe(handler: (event: PresencePostEvent) => void): () => void {
    this._emitter.on('presence', handler);
    return () => this._emitter.off('presence', handler);
  }

  start(): void {
    if (this._cleanupTimer) {
      return;
    }
    this._cleanupTimer = setInterval(() => this._cleanupAll(), this.cleanupIntervalMs);
    if (this._cleanupTimer.unref) {
      this._cleanupTimer.unref();
    }
  }

  stop(): void {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }

  reset(): void {
    this.stop();
    this._byPostId.clear();
    this._postContexts.clear();
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
   */
  mark(
    postId?: string | null,
    user?: PresenceUser | null,
    postContext?: { authorIds?: string[] },
  ): void {
    if (!postId || !user || !user.id) {
      return;
    }
    if (!this._cleanupTimer) {
      this.start();
    }

    if (postContext && Array.isArray(postContext.authorIds) && postContext.authorIds.length > 0) {
      this._postContexts.set(postId, { authorIds: postContext.authorIds.slice() });
    }

    const now = Date.now();
    const entries = this._byPostId.get(postId) || new Map<string, PresenceEntry>();
    const prev = entries.get(user.id);
    const wasActive = prev && !prev.isIdle && now - prev.lastSeen < this.ttlMs;

    entries.set(user.id, {
      id: user.id,
      name: user.name || '',
      profileImage: user.profileImage || null,
      lastSeen: now,
      isIdle: false,
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
  leave(postId?: string | null, userId?: string | null): void {
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

  snapshot(): PresenceSnapshotPost[] {
    const now = Date.now();
    const out: PresenceSnapshotPost[] = [];
    for (const [postId, entries] of this._byPostId.entries()) {
      const users: PresenceUserView[] = [];
      for (const entry of entries.values()) {
        if (now - entry.lastSeen < this.ttlMs) {
          users.push(this._toWireUser(entry));
        }
      }
      if (users.length > 0) {
        out.push({ postId, authorIds: this._authorIdsFor(postId), users });
      }
    }
    return out;
  }

  _authorIdsFor(postId: string): string[] {
    const ctx = this._postContexts.get(postId);
    return ctx && Array.isArray(ctx.authorIds) ? ctx.authorIds.slice() : [];
  }

  _toWireUser(entry: PresenceEntry): PresenceUserView {
    return {
      id: entry.id,
      name: entry.name,
      profileImage: entry.profileImage,
      isIdle: Boolean(entry.isIdle),
    };
  }

  _publish(postId: string, entries: Map<string, PresenceEntry> | undefined): void {
    const event: PresencePostEvent = {
      type: PRESENCE_EVENT_TYPES.POST,
      postId,
      authorIds: this._authorIdsFor(postId),
      users: entries ? Array.from(entries.values()).map((entry) => this._toWireUser(entry)) : [],
    };
    try {
      this._emitter.emit('presence', event);
    } catch (err) {
      logging.warn({ err, postId }, 'Presence subscriber threw during emit');
    }
  }

  /**
   * Each post is wrapped in try/catch so a single bad subscriber
   * doesn't abort the whole sweep.
   */
  _cleanupAll(): void {
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
        logging.warn({ err, postId }, 'Presence cleanup iteration failed');
      }
    }
  }

  _sweep(entries: Map<string, PresenceEntry>, now: number): boolean {
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
        entries.set(id, { ...entry, isIdle: shouldBeIdle });
        changed = true;
      }
    }
    return changed;
  }
}
