import moment from 'moment-timezone';
import { parsePostRevisions, revisionTime } from '@/editor/post-revisions';
import type { EditorRecord } from '@/editor/session/projection';

/** The label a revision carries beside its date; a revision has at most one. */
export type RevisionTag = 'latest' | 'published' | 'unpublished';

export interface RevisionEntry {
  id: string;
  lexical: string | null;
  title: string;
  customExcerpt: string | null;
  featureImage: string | null;
  featureImageAlt: string | null;
  featureImageCaption: string | null;
  authorName: string;
  authorImage: string | null;
  createdAt: string;
  /** In display order; a revision can be both the latest and a new publish. */
  tags: RevisionTag[];
}

/** An author the API no longer resolves, shown in place of a name. */
export const DELETED_AUTHOR = 'Deleted staff user';

/**
 * Whether the post has a history to show: never for one that has not been
 * saved or has no lexical content, and for a published or sent post only when
 * it also has a web version.
 */
export function canViewPostHistory(record: EditorRecord | undefined): boolean {
  // Ember gates on `lexical === null`, so an empty document still has a history.
  if (!record || record.lexical === null || record.lexical === undefined) {
    return false;
  }

  if (record.status !== 'published' && record.status !== 'sent') {
    return true;
  }

  return !('email_only' in record && record.email_only);
}

/**
 * The revisions newest first, each with the labels it carries: the newest is
 * `latest`, one that first took the post to published is `published`, and one
 * written because the post was unpublished is `unpublished`.
 */
export function revisionEntries(revisions: unknown = []): RevisionEntry[] {
  const ordered = parsePostRevisions(revisions).sort((a, b) => revisionTime(b) - revisionTime(a));

  return ordered.map((revision, index) => {
    const newPublish =
      revision.post_status === 'published' && ordered[index + 1]?.post_status === 'draft';

    const tags: RevisionTag[] = [];
    if (index === 0) {
      tags.push('latest');
    }
    if (newPublish) {
      tags.push('published');
    }
    if (revision.reason === 'unpublished') {
      tags.push('unpublished');
    }

    return {
      id: revision.id ?? String(index),
      lexical: revision.lexical ?? null,
      title: revision.title ?? '',
      customExcerpt: revision.custom_excerpt ?? null,
      featureImage: revision.feature_image ?? null,
      featureImageAlt: revision.feature_image_alt ?? null,
      featureImageCaption: revision.feature_image_caption ?? null,
      authorName: revision.author?.name || DELETED_AUTHOR,
      authorImage: revision.author?.profile_image ?? null,
      createdAt: revision.created_at ?? '',
      tags,
    };
  });
}

/** A revision's date in the site's timezone. */
export function revisionDate(createdAt: string, timezone: unknown): string {
  const zone = typeof timezone === 'string' && moment.tz.zone(timezone) ? timezone : 'Etc/UTC';
  const time = moment.tz(createdAt, zone);
  return time.isValid() ? time.format('D MMM YYYY, HH:mm') : '';
}
