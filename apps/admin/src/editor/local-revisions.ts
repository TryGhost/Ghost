import type { EditorErrorContext } from '@/editor/report-error';

/** Every entry is stored under `post-revision-<post id | draft>-<ms timestamp>`. */
export const LOCAL_REVISION_PREFIX = 'post-revision';

const UNSAVED_POST_ID = 'draft';
const MIN_WRITE_INTERVAL_MS = 60_000;
const KEPT_PER_POST = 5;

export interface LocalRevisionAuthor {
  id?: string;
}

export interface LocalRevisionTag {
  id?: string;
  name?: string;
  slug?: string | null;
}

/** A copy of a post as the editor held it. Entries may carry more fields than these. */
export interface LocalRevision {
  id: string;
  type: string;
  revisionTimestamp: number;
  title?: string;
  slug?: string;
  status?: string;
  lexical?: string | null;
  custom_excerpt?: string | null;
  excerpt?: string | null;
  feature_image?: string | null;
  feature_image_alt?: string | null;
  feature_image_caption?: string | null;
  authors?: LocalRevisionAuthor[];
  tags?: LocalRevisionTag[];
}

export interface StoredLocalRevision extends LocalRevision {
  key: string;
}

/** What the editor hands over: `id` is null until the post has been created. */
export type LocalRevisionDraft = Omit<LocalRevision, 'id' | 'type' | 'revisionTimestamp'> & {
  id: string | null;
};

type ErrorReporter = (error: unknown, context?: EditorErrorContext) => void;

function revisionKey(id: string, timestamp: number): string {
  return `${LOCAL_REVISION_PREFIX}-${id}-${timestamp}`;
}

function revisionKeys(storage: Storage, prefix = `${LOCAL_REVISION_PREFIX}-`): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) {
      keys.push(key);
    }
  }
  return keys;
}

function parseRevision(value: string | null): LocalRevision | null {
  if (value === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const revision = parsed as LocalRevision;
    return typeof revision.revisionTimestamp === 'number' ? revision : null;
  } catch {
    return null;
  }
}

/** Every readable entry, newest first. Unreadable entries are skipped, never thrown. */
export function readLocalRevisions(storage: Storage): StoredLocalRevision[] {
  const revisions: StoredLocalRevision[] = [];
  for (const key of revisionKeys(storage)) {
    const revision = parseRevision(storage.getItem(key));
    if (revision) {
      revisions.push({ ...revision, key });
    }
  }
  return revisions.sort((a, b) => b.revisionTimestamp - a.revisionTimestamp);
}

function isQuotaExceeded(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

// Every key ends in the time it was written, so ordering never needs to parse an entry.
function keyTimestamp(key: string): number {
  const timestamp = Number(key.slice(key.lastIndexOf('-') + 1));
  return Number.isFinite(timestamp) ? timestamp : -Infinity;
}

function byAge(keys: string[]): string[] {
  return keys.sort((a, b) => keyTimestamp(a) - keyTimestamp(b));
}

// The key just written is kept even when a skewed clock stamped it older than the rest.
function keepNewest(storage: Storage, id: string, written: string): void {
  if (id === UNSAVED_POST_ID) {
    return;
  }
  const others = byAge(revisionKeys(storage, `${LOCAL_REVISION_PREFIX}-${id}-`)).filter(
    (key) => key !== written,
  );
  for (const key of others.slice(0, Math.max(0, others.length - (KEPT_PER_POST - 1)))) {
    storage.removeItem(key);
  }
}

/**
 * Stores one revision and keeps the newest five per post; unsaved drafts are
 * never trimmed. A full store gives up its oldest entries until the write fits.
 */
export function writeLocalRevision(
  storage: Storage,
  revision: LocalRevision,
  onError: ErrorReporter,
): string | undefined {
  const key = revisionKey(revision.id, revision.revisionTimestamp);
  const value = JSON.stringify(revision);
  let evictable: string[] | null = null;

  for (;;) {
    try {
      storage.setItem(key, value);
      keepNewest(storage, revision.id, key);
      return key;
    } catch (error) {
      if (!isQuotaExceeded(error)) {
        onError(error, { tags: { localRevisions: 'saveError' } });
        return undefined;
      }
      storage.removeItem(key);
      if (evictable === null) {
        evictable = byAge(revisionKeys(storage));
        if (evictable.length > 0) {
          onError(new Error('LocalStorage quota exceeded. Removing old revisions.'), {
            tags: { localRevisions: 'quotaExceeded' },
          });
        }
      }
      const oldest = evictable.shift();
      if (oldest === undefined) {
        onError(new Error('LocalStorage quota exceeded. Unable to save revision.'), {
          tags: { localRevisions: 'quotaExceededNoSpace' },
        });
        return undefined;
      }
      storage.removeItem(oldest);
    }
  }
}

export interface LocalRevisionWriter {
  /** Writes at once when the last write is a minute old; otherwise the newest draft waits for the minute. */
  record: (draft: LocalRevisionDraft) => void;
  /** Writes the draft now and drops whatever was waiting. */
  flush: (draft: LocalRevisionDraft) => void;
  /** Drops whatever was waiting without writing it. */
  discard: () => void;
  /** The post now exists on the server, so this writer's copies under the unsaved-post id go. */
  created: () => void;
}

export interface LocalRevisionWriterOptions {
  type: 'post' | 'page';
  /** Read on every write: reading `localStorage` can throw where storage is blocked. */
  storage: () => Storage;
  onError: ErrorReporter;
  now?: () => number;
  minWriteIntervalMs?: number;
}

/**
 * Creating a writer starts nothing. A draft identical to the last copy written
 * is skipped, and a post that has not been created keeps at most five copies.
 */
export function createLocalRevisionWriter({
  type,
  storage,
  onError,
  now = Date.now,
  minWriteIntervalMs = MIN_WRITE_INTERVAL_MS,
}: LocalRevisionWriterOptions): LocalRevisionWriter {
  let lastWriteAt: number | null = null;
  let lastWritten: string | null = null;
  let waiting: LocalRevisionDraft | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let unsavedKeys: string[] = [];
  let storageBlocked = false;

  function reachStorage(): Storage | null {
    try {
      return storage();
    } catch (error) {
      // Blocked storage stays blocked for the page's life; one report says so.
      if (!storageBlocked) {
        storageBlocked = true;
        onError(error, { tags: { localRevisions: 'saveError' } });
      }
      return null;
    }
  }

  function write(draft: LocalRevisionDraft): void {
    if (storageBlocked) {
      return;
    }
    const content = JSON.stringify(draft);
    if (content === lastWritten) {
      return;
    }
    const store = reachStorage();
    if (!store) {
      return;
    }
    const timestamp = now();
    lastWriteAt = timestamp;
    lastWritten = content;
    const key = writeLocalRevision(
      store,
      { ...draft, id: draft.id ?? UNSAVED_POST_ID, type, revisionTimestamp: timestamp },
      onError,
    );
    if (key && draft.id === null) {
      unsavedKeys = [...unsavedKeys.filter((kept) => kept !== key), key];
      for (const stale of unsavedKeys.splice(0, Math.max(0, unsavedKeys.length - KEPT_PER_POST))) {
        store.removeItem(stale);
      }
    }
  }

  function cancelWaiting(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    waiting = null;
  }

  return {
    record: (draft) => {
      if (timer !== null) {
        waiting = draft;
        return;
      }
      const elapsed = lastWriteAt === null ? Infinity : now() - lastWriteAt;
      // A clock that moved backwards counts as a quiet minute.
      if (elapsed < 0 || elapsed >= minWriteIntervalMs) {
        write(draft);
        return;
      }
      waiting = draft;
      timer = setTimeout(() => {
        timer = null;
        const next = waiting;
        waiting = null;
        if (next) {
          write(next);
        }
      }, minWriteIntervalMs - elapsed);
    },
    flush: (draft) => {
      cancelWaiting();
      write(draft);
    },
    discard: cancelWaiting,
    created: () => {
      const keys = unsavedKeys;
      unsavedKeys = [];
      const store = keys.length > 0 ? reachStorage() : null;
      for (const key of keys) {
        store?.removeItem(key);
      }
    },
  };
}
