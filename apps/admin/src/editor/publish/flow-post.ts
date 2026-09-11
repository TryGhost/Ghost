import type { Email, PostStatus } from '@tryghost/admin-x-framework/api/posts';
import type { EditorSaveSnapshot } from '@/editor/session/snapshot';
import type { EditorRecord } from '@/editor/session/projection';

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
  /** The post's own newsletter, which may since have been archived. */
  newsletterName?: string | null;
  newsletterStatus?: string | null;
  emailSegment?: string | null;
  /** The durable `email_only` flag; scheduled email-only posts still have `status: scheduled`. */
  emailOnly?: boolean;
  email?: Email | null;
  /** When the post's email was created, for the update flow's historic sentence. */
  emailCreatedAt?: string | null;
  /** The unsaved body when the editor has one; read only by the public-preview predicate. */
  lexical?: string | null;
}

export function isPage(post: PublishFlowPost): boolean {
  return post.displayName === 'page';
}

/** The API types the newsletter relation as a bare object; the editor read includes it. */
interface RecordNewsletter {
  slug?: string;
  name?: string;
  status?: string;
}

export interface PublishFlowPostSources {
  /** The engine's view of the post: identity, status, publish time and the live title. */
  snapshot: EditorSaveSnapshot;
  /** The record the session is loaded at; absent until a created post has been read back. */
  record?: EditorRecord;
  displayName: 'post' | 'page';
  /** The body the writer is looking at, which the public-preview predicate reads. */
  lexical?: string | null;
}

/**
 * Projects the post the editor holds into the publish flow's input. Status,
 * publish time and title come from the engine, so a publish that has landed is
 * described before the record has been read back; everything else needs the
 * server's copy and is left out until there is one.
 */
export function buildPublishFlowPost({
  snapshot,
  record,
  displayName,
  lexical,
}: PublishFlowPostSources): PublishFlowPost {
  const email = record && 'email' in record ? (record.email ?? null) : null;
  const newsletter =
    record && 'newsletter' in record ? (record.newsletter as RecordNewsletter | null) : null;

  return {
    id: snapshot.id ?? record?.id ?? '',
    displayName,
    status: snapshot.status,
    title: snapshot.title,
    excerpt: record?.custom_excerpt ?? null,
    url: record?.url ?? null,
    featureImage: record?.feature_image ?? null,
    publishedAt: snapshot.publishedAt,
    visibility: record?.visibility ?? null,
    tiers: (record?.tiers ?? []).flatMap((tier) => (tier.slug ? [{ slug: tier.slug }] : [])),
    newsletter: newsletter?.slug ?? null,
    newsletterName: newsletter?.name ?? null,
    newsletterStatus: newsletter?.status ?? null,
    emailSegment: record && 'email_segment' in record ? (record.email_segment ?? null) : null,
    emailOnly: record && 'email_only' in record ? record.email_only === true : false,
    email,
    emailCreatedAt: email?.created_at ?? null,
    lexical: lexical ?? record?.lexical ?? null,
  };
}
