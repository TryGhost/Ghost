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
    featured: false,
    visibility: null,
    tiers: [],
    authors: [],
    meta_title: null,
    meta_description: null,
    canonical_url: null,
    custom_template: null,
    codeinjection_head: null,
    codeinjection_foot: null,
    og_image: null,
    og_title: null,
    og_description: null,
    twitter_image: null,
    twitter_title: null,
    twitter_description: null,
    show_title_and_feature_image: null,
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
    featured: record.featured ?? false,
    visibility: record.visibility ?? null,
    tiers: record.tiers ?? [],
    authors: record.authors ?? [],
    meta_title: record.meta_title ?? null,
    meta_description: record.meta_description ?? null,
    canonical_url: record.canonical_url ?? null,
    custom_template: record.custom_template ?? null,
    codeinjection_head: record.codeinjection_head ?? null,
    codeinjection_foot: record.codeinjection_foot ?? null,
    og_image: record.og_image ?? null,
    og_title: record.og_title ?? null,
    og_description: record.og_description ?? null,
    twitter_image: record.twitter_image ?? null,
    twitter_title: record.twitter_title ?? null,
    twitter_description: record.twitter_description ?? null,
    show_title_and_feature_image:
      'show_title_and_feature_image' in record
        ? (record.show_title_and_feature_image ?? null)
        : null,
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
