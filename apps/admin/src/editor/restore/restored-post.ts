import type { PostAuthorInput, PostTagInput } from '@tryghost/admin-x-framework/api/posts';
import type { LocalRevision, LocalRevisionTag } from '@/editor/local-revisions';

// Core refuses a title longer than this, counted in characters.
const MAX_TITLE_LENGTH = 255;

/** The draft a restore creates from a local copy. */
export interface RestoredPost {
  type: 'post' | 'page';
  title: string;
  slug: string;
  lexical: string | null;
  status: 'draft';
  /** Left out when there is nobody to credit, so the server credits the current user. */
  authors?: PostAuthorInput[];
  tags: PostTagInput[];
  custom_excerpt?: string;
  feature_image?: string;
  feature_image_alt?: string;
  feature_image_caption?: string;
}

export interface RestoredPostOptions {
  /** Authors and Contributors may only create posts they are the first author of. */
  soleAuthorId?: string;
}

function tagInput({ id, name, slug }: LocalRevisionTag): PostTagInput[] {
  const known = {
    ...(typeof name === 'string' && name ? { name } : {}),
    ...(typeof slug === 'string' && slug ? { slug } : {}),
  };
  if (typeof id === 'string' && id) {
    return [{ id, ...known }];
  }
  return known.name ? [{ ...known, name: known.name }] : [];
}

function listOf<T extends object>(value: unknown): T[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return (value as unknown[]).filter(
    (item): item is T => item !== null && typeof item === 'object',
  );
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function restoredTitle(title: unknown): string {
  const restored = `(Restored) ${typeof title === 'string' ? title : ''}`.trimEnd();
  return Array.from(restored).slice(0, MAX_TITLE_LENGTH).join('');
}

/** A copy becomes a new draft, marked as restored; the post it was taken from is left alone. */
export function restoredPost(
  revision: LocalRevision,
  { soleAuthorId }: RestoredPostOptions = {},
): RestoredPost {
  const authors = soleAuthorId
    ? [{ id: soleAuthorId }]
    : listOf<{ id?: unknown }>(revision.authors).flatMap(({ id }) =>
        typeof id === 'string' && id ? [{ id }] : [],
      );
  const optional = {
    custom_excerpt: text(revision.custom_excerpt),
    feature_image: text(revision.feature_image),
    feature_image_alt: text(revision.feature_image_alt),
    feature_image_caption: text(revision.feature_image_caption),
  };

  return {
    type: revision.type === 'page' ? 'page' : 'post',
    title: restoredTitle(revision.title),
    slug: text(revision.slug) ?? 'untitled',
    lexical: text(revision.lexical) ?? null,
    status: 'draft',
    ...(authors.length > 0 ? { authors } : {}),
    tags: listOf<LocalRevisionTag>(revision.tags).flatMap(tagInput),
    ...Object.fromEntries(Object.entries(optional).filter(([, value]) => value !== undefined)),
  };
}
