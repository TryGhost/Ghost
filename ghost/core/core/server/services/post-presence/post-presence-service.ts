import { EventEmitter } from 'events';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';

// Keep in sync with EVENT_TYPE_* in apps/ember-admin/app/services/presence.js
export const PRESENCE_EVENT_TYPES = Object.freeze({
  POST: 'post',
  SNAPSHOT: 'snapshot',
});

const DEFAULT_IDLE_MS = 90 * 1000;
const DEFAULT_TTL_MS = 180 * 1000;

export type PresenceUser = {
  id: string;
  name?: string;
  profileImage?: string | null;
};

export type PresenceEntry = {
  id: string;
  name: string;
  profileImage: string | null;
  lastSeen: number;
  isIdle: boolean;
};

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

export type MarkPresenceOptions = {
  heartbeat?: boolean;
};

/** In-process map of who has which post open. One Node process per Ghost(Pro) site. */
export class PostPresenceService {
  idleMs: number;
  ttlMs: number;
  cleanupIntervalMs: number;
  _byPostId: Map<string, Map<string, PresenceEntry>>;
  _postContexts: Map<string, PresencePostContext>;
  _emitter: EventEmitter;
  _cleanupTimer: NodeJS.Timeout | null;

  constructor({
    idleMs = DEFAULT_IDLE_MS,
    ttlMs = DEFAULT_TTL_MS,
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

  /** Enter or heartbeat. Heartbeats only refresh an existing entry so other save UIs cannot mint presence. */
  mark(
    postId?: string | null,
    user?: PresenceUser | null,
    postContext?: { authorIds?: string[] },
    { heartbeat = false }: MarkPresenceOptions = {},
  ): void {
    if (!postId || !user || !user.id) {
      return;
    }
    const entries = this._entriesFor(postId);
    if (heartbeat && !entries.has(user.id)) {
      return;
    }
    if (!this._cleanupTimer) {
      this.start();
    }

    this._rememberAuthorIds(postId, postContext);

    const now = Date.now();
    const wasActive = this._isActive(entries.get(user.id), now);

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

  leave(postId?: string | null, userId?: string | null): void {
    if (!postId || !userId) {
      return;
    }
    const entries = this._byPostId.get(postId);
    if (!entries || !entries.has(userId)) {
      return;
    }
    entries.delete(userId);
    // Publish while authorIds still exist so Authors receive the empty list.
    this._publish(postId, entries);
    this._dropIfEmpty(postId, entries);
  }

  snapshot(): PresenceSnapshotPost[] {
    const now = Date.now();
    const out: PresenceSnapshotPost[] = [];
    for (const [postId, entries] of this._byPostId.entries()) {
      const users = this._freshUsers(entries, now);
      if (users.length > 0) {
        out.push({ postId, authorIds: this._authorIdsFor(postId), users });
      }
    }
    return out;
  }

  _entriesFor(postId: string): Map<string, PresenceEntry> {
    return this._byPostId.get(postId) || new Map();
  }

  _rememberAuthorIds(postId: string, postContext?: { authorIds?: string[] }): void {
    const authorIds = postContext?.authorIds;
    if (!Array.isArray(authorIds) || authorIds.length === 0) {
      return;
    }
    this._postContexts.set(postId, { authorIds: authorIds.slice() });
  }

  _isActive(entry: PresenceEntry | undefined, now: number): boolean {
    return Boolean(entry && !entry.isIdle && now - entry.lastSeen < this.ttlMs);
  }

  _freshUsers(entries: Map<string, PresenceEntry>, now: number): PresenceUserView[] {
    const users: PresenceUserView[] = [];
    for (const entry of entries.values()) {
      if (now - entry.lastSeen < this.ttlMs) {
        users.push(this._toWireUser(entry));
      }
    }
    return users;
  }

  _authorIdsFor(postId: string): string[] {
    const ctx = this._postContexts.get(postId);
    return ctx && Array.isArray(ctx.authorIds) ? ctx.authorIds.slice() : [];
  }

  _dropIfEmpty(postId: string, entries: Map<string, PresenceEntry>): void {
    if (entries.size > 0) {
      return;
    }
    this._byPostId.delete(postId);
    this._postContexts.delete(postId);
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

  _cleanupAll(): void {
    const now = Date.now();
    for (const [postId, entries] of this._byPostId.entries()) {
      try {
        const changed = this._sweep(entries, now);
        if (!changed) {
          continue;
        }
        this._publish(postId, entries);
        this._dropIfEmpty(postId, entries);
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
