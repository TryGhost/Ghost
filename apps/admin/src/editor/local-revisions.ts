/**
 * Crash-recovery store for local post revisions, kept in localStorage.
 *
 * Port of Ember's local-revisions service
 * (ghost/admin/app/services/local-revisions.js). The storage schema is shared
 * between the two admin shells so revisions written by either one are
 * restorable from either:
 *
 * - key: `post-revision-{postId}-{revisionTimestamp}` (id defaults to
 *   "draft" for unsaved posts)
 * - value: the serialized post data (API shape: title, lexical, slug,
 *   excerpt/custom_excerpt, authors, tags, status, ...) plus `id`, `type`
 *   ("post" | "page") and `revisionTimestamp` added on save
 *
 * This module is framework-free on purpose: the editor hook schedules writes
 * through it and the /restore screen reads from it.
 */

export const REVISION_PREFIX = "post-revision";
export const MIN_REVISION_TIME_MS = 60_000; // 1 minute, same as Ember
export const MAX_REVISIONS_PER_POST = 5;

export interface LocalRevisionAuthor {
    id?: string;
    [field: string]: unknown;
}

export interface LocalRevisionTag {
    name?: string;
    [field: string]: unknown;
}

/** Serialized post data passed into a save. */
export interface LocalRevisionInput {
    id?: string | null;
    title?: string;
    lexical?: string | null;
    status?: string;
    slug?: string;
    excerpt?: string | null;
    custom_excerpt?: string | null;
    authors?: LocalRevisionAuthor[];
    tags?: LocalRevisionTag[];
    [field: string]: unknown;
}

/** A revision as persisted in localStorage. */
export interface LocalRevision extends LocalRevisionInput {
    id: string;
    type: string;
    revisionTimestamp: number;
}

/** A persisted revision plus the localStorage key it lives under. */
export type StoredRevision = LocalRevision & { key: string };

export interface LocalRevisionsStoreOptions {
    storage?: Storage;
    minRevisionTime?: number;
    now?: () => number;
}

export class LocalRevisionsStore {
    private readonly storage: Storage;
    private readonly minRevisionTime: number;
    private readonly now: () => number;

    private lastRevisionTime: number | null = null;
    private pending: { type: string; data: LocalRevisionInput } | null = null;
    private timer: ReturnType<typeof setTimeout> | null = null;

    constructor({
        storage = window.localStorage,
        minRevisionTime = MIN_REVISION_TIME_MS,
        now = Date.now,
    }: LocalRevisionsStoreOptions = {}) {
        this.storage = storage;
        this.minRevisionTime = minRevisionTime;
        this.now = now;
    }

    generateKey(data: Pick<LocalRevision, "id" | "revisionTimestamp">): string {
        return `${REVISION_PREFIX}-${data.id}-${data.revisionTimestamp}`;
    }

    /**
     * Schedule a revision save for a draft. Mirrors Ember's keepLatest
     * saveTask: the first save in a quiet period is written immediately,
     * subsequent calls within MIN_REVISION_TIME are coalesced into a single
     * delayed write carrying the latest data.
     */
    scheduleSave(type: string, data: LocalRevisionInput): void {
        if (!data || data.status !== "draft") {
            return;
        }

        this.pending = { type, data };

        if (this.timer !== null) {
            // a delayed save is already scheduled; it picks up the latest data
            return;
        }

        const currentTime = this.now();
        if (this.lastRevisionTime === null || currentTime - this.lastRevisionTime > this.minRevisionTime) {
            this.flushPending();
        } else {
            const waitTime = this.minRevisionTime - (currentTime - this.lastRevisionTime);
            this.timer = setTimeout(() => {
                this.timer = null;
                this.flushPending();
            }, waitTime);
        }
    }

    /**
     * Write a revision to localStorage immediately. If localStorage is full,
     * the oldest revision is evicted and the save retried.
     *
     * @returns the key of the saved revision, or undefined when it couldn't
     * be saved
     */
    performSave(type: string, data: LocalRevisionInput): string | undefined {
        const revision: LocalRevision = {
            ...data,
            id: data.id || "draft",
            type,
            revisionTimestamp: this.now(),
        };
        const key = this.generateKey(revision);

        try {
            this.storage.setItem(key, JSON.stringify(revision));
            this.filterRevisions(revision.id);
            return key;
        } catch (err) {
            if (err instanceof Error && err.name === "QuotaExceededError") {
                // remove the current key in case it was partially written
                this.remove(key);

                // evict the oldest revision and try again
                if (this.keys().length) {
                    this.removeOldest();
                    return this.performSave(type, data);
                }
            }
            // localStorage is unavailable/full with nothing to evict — the
            // revision can't be saved, and that must never break the editor
            return undefined;
        }
    }

    /** Returns the revision stored under `key`, or null. */
    find(key: string): LocalRevision | null {
        const value = this.storage.getItem(key);
        return value === null ? null : (JSON.parse(value) as LocalRevision);
    }

    /**
     * Returns all revisions (optionally filtered by key prefix), newest
     * first, each including the key it is stored under.
     */
    findAll(prefix: string = REVISION_PREFIX): StoredRevision[] {
        const revisions = this.keys(prefix).map((key) => {
            const revision = JSON.parse(this.storage.getItem(key) as string) as LocalRevision;
            return { key, ...revision };
        });

        revisions.sort((a, b) => b.revisionTimestamp - a.revisionTimestamp);

        return revisions;
    }

    remove(key: string): void {
        this.storage.removeItem(key);
    }

    /** Removes the oldest revision to clear up space. */
    removeOldest(): void {
        const keysByTimestamp = this.keys().map(key => ({
            key,
            timestamp: this.find(key)?.revisionTimestamp ?? 0,
        }));
        keysByTimestamp.sort((a, b) => a.timestamp - b.timestamp);
        if (keysByTimestamp.length) {
            this.remove(keysByTimestamp[0].key);
        }
    }

    /** Removes all revisions. */
    clear(): void {
        for (const key of this.keys()) {
            this.remove(key);
        }
    }

    /** Returns all revision keys, optionally filtered by prefix. */
    keys(prefix: string = REVISION_PREFIX): string[] {
        const allKeys: string[] = [];
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key !== null && key.startsWith(prefix)) {
                allKeys.push(key);
            }
        }
        return allKeys;
    }

    /** Keeps only the newest MAX_REVISIONS_PER_POST revisions for a post. */
    filterRevisions(postId: string): void {
        if (postId === "draft") {
            return; // unsaved drafts share an id, never filter them
        }

        const allRevisions = this.findAll(`${REVISION_PREFIX}-${postId}`);
        for (const revision of allRevisions.slice(MAX_REVISIONS_PER_POST)) {
            this.remove(revision.key);
        }
    }

    /** Cancels any scheduled save (e.g. when the editor unmounts). */
    destroy(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.pending = null;
    }

    private flushPending(): void {
        const pending = this.pending;
        this.pending = null;
        if (!pending) {
            return;
        }
        this.performSave(pending.type, pending.data);
        this.lastRevisionTime = this.now();
    }
}
