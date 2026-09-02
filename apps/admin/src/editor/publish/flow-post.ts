import type { Email, PostStatus } from '@tryghost/admin-x-framework/api/posts';

/**
 * What the publish flow needs from the post being published. A projection, not
 * the API record: the flow reads it and never writes to it.
 */
export interface PublishFlowPost {
  id: string;
  /** 'post' or 'page' — Ember's `displayName`, used verbatim in copy. */
  displayName: 'post' | 'page';
  status: PostStatus;
  title: string;
  excerpt?: string | null;
  /** The post's front-end URL, for the complete step's bookmark. */
  url?: string | null;
  featureImage?: string | null;
  publishedAt?: string | null;
  visibility?: string | null;
  tiers?: ReadonlyArray<{ slug: string }>;
  /** Persisted newsletter slug and segment; the machine seeds its picker from them. */
  newsletter?: string | null;
  newsletterName?: string | null;
  emailSegment?: string | null;
  email?: Email | null;
  /** The unsaved body when the editor has one; read only by the public-preview predicate. */
  lexical?: string | null;
}

export function isPage(post: PublishFlowPost): boolean {
  return post.displayName === 'page';
}
