import type { InReplyTo } from '../api/activitypub';
import type { ObjectProperties } from '@tryghost/admin-x-framework/api/activitypub';

export type ObjectWithReplyContext = ObjectProperties & {
  inReplyTo?: InReplyTo | null;
};

export type ReplyBanner =
  | { kind: 'continuing' }
  | { kind: 'generic' }
  | { kind: 'named'; name: string; handle: string | null };

/** Complete `@user@host` only; reject empty/placeholder hosts (username `unknown` is allowed). */
export function normalizeHandle(handle: string | null | undefined): string | null {
  const normalized = handle?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^@([^@]+)@([^@]+)$/);
  if (!match) {
    return null;
  }

  const [, user, host] = match;
  if (!user) {
    return null;
  }
  if (!host || host === 'unknown' || !host.includes('.')) {
    return null;
  }

  return normalized;
}

/** Pick feed reply banner; self-detect is handle-only (never id/URL). */
export function getReplyBanner(
  inReplyTo: InReplyTo | null | undefined,
  noteAuthorHandle: string | null | undefined,
): ReplyBanner | null {
  if (!inReplyTo) {
    return null;
  }

  const parent = inReplyTo.author;

  if (!parent) {
    return { kind: 'generic' };
  }

  const parentHandle = normalizeHandle(parent.handle);
  const noteHandle = normalizeHandle(noteAuthorHandle);

  if (parentHandle && noteHandle && parentHandle === noteHandle) {
    return { kind: 'continuing' };
  }

  const name = parent.name?.trim() || (parentHandle ? parent.handle.trim() : '') || '';

  if (!name) {
    return { kind: 'generic' };
  }

  return {
    kind: 'named',
    name,
    handle: parentHandle ? parent.handle.trim() : null,
  };
}
