import { faker } from '@faker-js/faker';
import { buildLexicalParagraph } from './lexical';
import { createBuilder } from '../factory';
import { generateId, generateSlug, generateUuid } from '../utils';
import type { Tag } from './tag';

/**
 * One entry of a post's revision history, as the Admin API returns it under
 * `include=post_revisions,post_revisions.author`.
 */
export interface PostRevision {
  id: string;
  post_id: string;
  lexical: string | null;
  title: string | null;
  feature_image: string | null;
  feature_image_alt: string | null;
  feature_image_caption: string | null;
  custom_excerpt: string | null;
  post_status: 'draft' | 'published' | 'scheduled' | 'sent';
  reason: string | null;
  created_at: string;
  author?: { id: string; name: string; profile_image?: string | null } | null;
}

/**
 * Ghost Admin API post resource — the API *response* shape: ISO-string dates
 * and `email_segment` (the write side sends `email_recipient_filter` instead).
 * Write-lane consumers derive their create payload from this builder — see
 * e2e's PostFactory.
 */
export interface Post {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  mobiledoc: string | null;
  lexical: string | null;
  html: string;
  /** Only present when the request asks for the plaintext format. */
  plaintext?: string;
  comment_id: string;
  feature_image: string | null;
  feature_image_alt: string | null;
  feature_image_caption: string | null;
  featured: boolean;
  status: 'draft' | 'published' | 'scheduled' | 'sent';
  visibility: 'public' | 'members' | 'paid' | 'tiers';
  email_segment: string;
  email_subject: string | null;
  email_only: boolean;
  frontmatter: string | null;
  custom_excerpt: string | null;
  excerpt: string | null;
  codeinjection_head: string | null;
  codeinjection_foot: string | null;
  custom_template: string | null;
  /** Pages only: whether the page renders its own title and feature image. */
  show_title_and_feature_image?: boolean;
  canonical_url: string | null;
  og_image: string | null;
  og_title: string | null;
  og_description: string | null;
  twitter_image: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  reading_time: number;
  url?: string;
  tags?: Tag[];
  /** The API returns this alongside `tags`; the list screens render it. */
  primary_tag?: Tag | null;
  tiers?: unknown[];
  authors?: unknown[];
  count?: { clicks: number; positive_feedback: number; negative_feedback: number };
  /** Only present when the request includes `email`; set for posts sent as an email. */
  // `track_opens`/`track_clicks` are per-email, not per-site: an email sent
  // before the setting changed keeps the flags it went out with, and that is
  // what decides whether the Opens/Clicks columns show.
  email?: {
    id?: string;
    email_count: number;
    error?: string | null;
    opened_count: number;
    status?: string;
    track_opens?: boolean;
    track_clicks?: boolean;
  } | null;
  /** Only present when the request includes `newsletter`; the newsletter the email went to. */
  newsletter?: { id: string; name?: string; feedback_enabled?: boolean } | null;
  /** Only present when the request includes `post_revisions`; newest last. */
  post_revisions?: PostRevision[];
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export const postRevision = createBuilder<PostRevision>(() => {
  const content = faker.lorem.paragraphs(2);

  return {
    id: generateId(),
    post_id: generateId(),
    lexical: buildLexicalParagraph(content),
    title: faker.lorem.sentence(),
    feature_image: null,
    feature_image_alt: null,
    feature_image_caption: null,
    custom_excerpt: null,
    post_status: 'draft',
    reason: null,
    created_at: new Date().toISOString(),
    author: { id: generateId(), name: faker.person.fullName(), profile_image: null },
  };
});

export const post = createBuilder<Post>(() => {
  const now = new Date().toISOString();
  const title = faker.lorem.sentence();
  const content = faker.lorem.paragraphs(3);
  const excerpt = faker.lorem.paragraph();

  return {
    id: generateId(),
    uuid: generateUuid(),
    title,
    slug: `${generateSlug(title)}-${faker.string.alphanumeric(6).toLowerCase()}`,
    mobiledoc: null,
    lexical: buildLexicalParagraph(content),
    html: `<p>${content}</p>`,
    plaintext: content,
    comment_id: generateId(),
    feature_image: null,
    feature_image_alt: null,
    feature_image_caption: null,
    featured: faker.datatype.boolean(),
    status: 'draft',
    visibility: 'public',
    email_segment: 'all',
    email_subject: null,
    email_only: false,
    frontmatter: null,
    custom_excerpt: excerpt,
    excerpt,
    codeinjection_head: null,
    codeinjection_foot: null,
    custom_template: null,
    canonical_url: null,
    og_image: null,
    og_title: null,
    og_description: null,
    twitter_image: null,
    twitter_title: null,
    twitter_description: null,
    meta_title: null,
    meta_description: null,
    reading_time: 0,
    url: undefined,
    created_at: now,
    updated_at: now,
    published_at: null,
  };
});
