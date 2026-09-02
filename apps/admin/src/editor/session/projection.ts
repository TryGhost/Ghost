import type { PageEditorRecord } from '@tryghost/admin-x-framework/api/pages';
import type { PostEditorRecord, PostRevision } from '@tryghost/admin-x-framework/api/posts';
import type { EditablePostProjection, RevisionProjection } from '@/editor/engine/change-tracker';

export type EditorRecord = PostEditorRecord | PageEditorRecord;

export function newPostProjection(): EditablePostProjection {
  return {
    title: '',
    slug: '',
    lexical: null,
    tags: [],
    custom_excerpt: null,
    feature_image: null,
    feature_image_alt: null,
    feature_image_caption: null,
    updated_at: null,
  };
}

export function projectionOf(record: EditorRecord): EditablePostProjection {
  return {
    title: record.title,
    slug: record.slug,
    lexical: record.lexical ?? null,
    tags: record.tags ?? [],
    custom_excerpt: record.custom_excerpt ?? null,
    feature_image: record.feature_image ?? null,
    feature_image_alt: record.feature_image_alt ?? null,
    feature_image_caption: record.feature_image_caption ?? null,
    updated_at: record.updated_at,
  };
}

function revisionTime(revision: PostRevision): number {
  const time = Date.parse(revision.created_at ?? '');
  return Number.isNaN(time) ? 0 : time;
}

/** The newest revision the server sent, or null when the record carries none. */
export function latestRevisionOf(record: EditorRecord | undefined): RevisionProjection | null {
  const revisions = record?.post_revisions ?? [];
  if (revisions.length === 0) {
    return null;
  }

  const latest = revisions.reduce((newest, revision) =>
    revisionTime(revision) >= revisionTime(newest) ? revision : newest,
  );

  return {
    lexical: latest.lexical ?? null,
    title: latest.title ?? '',
    custom_excerpt: latest.custom_excerpt ?? null,
    feature_image: latest.feature_image ?? null,
  };
}
