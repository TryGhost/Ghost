/**
 * The newsletter each draft was last pointed at. A draft
 * has no newsletter on the server until it is sent or scheduled, so the pick made
 * in the preview or the publish flow is remembered in this browser, keyed by post
 * id, and both start from it the next time. The default newsletter is never
 * remembered, so a draft without an entry follows the site's newsletter order.
 */

import type { PostStatus } from '@tryghost/admin-x-framework/api/posts';
import { selectableNewsletters, type NewsletterInput } from './publish-options';

/** One map of post id to entry, under a single key. */
export const DRAFT_NEWSLETTERS_KEY = 'ghost-editor-draft-newsletters';

/** Entries kept; the least recently written go first. */
export const MAX_DRAFT_NEWSLETTERS = 100;

export interface DraftNewsletterEntry {
  slug: string;
  /** Milliseconds; orders entries for pruning. */
  updatedAt: number;
}

type DraftNewsletters = Record<string, DraftNewsletterEntry>;

/**
 * The browser's storage, or null where it is blocked. Every read and write below
 * takes null as "nothing stored".
 */
export function draftNewsletterStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isEntry(value: unknown): value is DraftNewsletterEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const { slug, updatedAt } = value as Partial<DraftNewsletterEntry>;
  return typeof slug === 'string' && slug !== '' && typeof updatedAt === 'number';
}

/** Every readable entry. A missing, blocked or corrupt store reads as empty, never throws. */
function readEntries(storage: Storage | null): DraftNewsletters {
  if (!storage) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(storage.getItem(DRAFT_NEWSLETTERS_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(Object.entries(parsed).filter(([, entry]) => isEntry(entry)));
  } catch {
    return {};
  }
}

/** The draft's remembered newsletter slug, or null when it has none. */
export function readDraftNewsletter(storage: Storage | null, postId: string): string | null {
  return readEntries(storage)[postId]?.slug ?? null;
}

/**
 * Remembers `slug` for the draft, or forgets its entry when `slug` is null, and
 * keeps the newest hundred entries. A full or blocked store keeps what it had.
 */
export function writeDraftNewsletter(
  storage: Storage | null,
  postId: string,
  slug: string | null,
  now: number = Date.now(),
): void {
  if (!storage || !postId) {
    return;
  }
  const entries = readEntries(storage);
  if (slug === null && !(postId in entries)) {
    return;
  }
  delete entries[postId];
  if (slug !== null) {
    entries[postId] = { slug, updatedAt: now };
  }
  const kept = Object.entries(entries)
    .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_DRAFT_NEWSLETTERS);
  try {
    if (kept.length === 0) {
      storage.removeItem(DRAFT_NEWSLETTERS_KEY);
    } else {
      storage.setItem(DRAFT_NEWSLETTERS_KEY, JSON.stringify(Object.fromEntries(kept)));
    }
  } catch {
    // A full or blocked store costs the remembered newsletter, not the pick.
  }
}

/**
 * What a pick leaves stored: the slug, or null when it is the default newsletter,
 * so the draft follows the site's order again.
 */
export function draftNewsletterToStore(
  slug: string,
  newsletters: ReadonlyArray<NewsletterInput>,
): string | null {
  return slug === selectableNewsletters(newsletters)[0]?.slug ? null : slug;
}

export interface ResolvedDraftNewsletter {
  /** The newsletter the draft's preview and publish flow start on; null for the default. */
  slug: string | null;
  /** The entry names a newsletter that is no longer selectable, so it should go. */
  stale: boolean;
}

/**
 * The remembered newsletter a draft starts on. Only drafts read entries. An entry for a newsletter since archived or deleted is
 * ignored and reported stale; `newsletters` is null until the site's list is known,
 * when nothing can be judged yet.
 */
export function resolveDraftNewsletter({
  status,
  stored,
  newsletters,
}: {
  status: PostStatus;
  stored: string | null;
  newsletters: ReadonlyArray<NewsletterInput> | null;
}): ResolvedDraftNewsletter {
  if (status !== 'draft' || !stored || !newsletters) {
    return { slug: null, stale: false };
  }
  const selectable = selectableNewsletters(newsletters).some(
    (newsletter) => newsletter.slug === stored,
  );
  return selectable ? { slug: stored, stale: false } : { slug: null, stale: true };
}

/**
 * The newsletter an unscheduled post was going to send with, which its draft
 * should offer again: a scheduled post with a newsletter and no email yet.
 */
export function scheduledNewsletterToRestore(post: {
  status: PostStatus;
  newsletter?: string | null;
  email?: unknown;
}): string | null {
  return post.status === 'scheduled' && post.newsletter && !post.email ? post.newsletter : null;
}
