import { describe, expect, it } from 'vitest';
import type {
  AddPagePayload,
  EditPagePayload,
  Page,
  PageEditableData,
  PageResponseType,
} from '../../../src/api/pages';
import type {
  AddPostPayload,
  EditPostPayload,
  Post,
  PostEditableData,
  PostResponseType,
  PostRevision,
} from '../../../src/api/posts';
import {
  ALL_POST_INCLUDES,
  POST_FORMATS,
  buildPageWriteParams,
  buildPostEditorReadParams,
  buildPostReadParams,
  buildPostWriteParams,
  serializePostPayload,
} from '../../../src/api/post-contract';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;

type Assert<Condition extends true> = Condition;

type ExpectedContentEditableKey =
  | 'title'
  | 'slug'
  | 'mobiledoc'
  | 'lexical'
  | 'html'
  | 'locale'
  | 'feature_image'
  | 'feature_image_alt'
  | 'feature_image_caption'
  | 'featured'
  | 'meta_title'
  | 'meta_description'
  | 'updated_at'
  | 'published_at'
  | 'custom_excerpt'
  | 'codeinjection_head'
  | 'codeinjection_foot'
  | 'og_image'
  | 'og_title'
  | 'og_description'
  | 'twitter_image'
  | 'twitter_title'
  | 'twitter_description'
  | 'custom_template'
  | 'canonical_url'
  | 'visibility'
  | 'visibility_filter'
  | 'authors'
  | 'tags'
  | 'tiers';

const sharedTypeAssertions: [
  Assert<Equal<PostEditableData['canonical_url'], PageEditableData['canonical_url']>>,
  Assert<Equal<Post['title'], Page['title']>>,
  Assert<
    Equal<
      keyof PostEditableData,
      ExpectedContentEditableKey | 'status' | 'email_subject' | 'email_only'
    >
  >,
  Assert<
    Equal<
      keyof PageEditableData,
      ExpectedContentEditableKey | 'status' | 'show_title_and_feature_image'
    >
  >,
] = [true, true, true, true];

// Compile-time cases: the build failing is the assertion. Each `@ts-expect-error`
// fails the build if the request and response types drift from the Admin API schema.
const postEditWithoutUpdatedAt: EditPostPayload = {
  // @ts-expect-error post edits require the collision token
  post: { id: 'post-1' },
};

const pageEditWithoutUpdatedAt: EditPagePayload = {
  // @ts-expect-error page edits require the collision token
  page: { id: 'page-1' },
};

const postCreateWithoutTitle: AddPostPayload = {
  // @ts-expect-error post creates require a title
  post: { status: 'draft' },
};

const pageCreateWithoutTitle: AddPagePayload = {
  // @ts-expect-error page creates require a title
  page: { status: 'draft' },
};

// The API accepts updated_at on creates, even though clients normally omit it.
const postCreateWithUpdatedAt: AddPostPayload = {
  post: { title: 'Hello', updated_at: '2026-01-01T00:00:00.000Z' },
};

const pageCreateWithUpdatedAt: AddPagePayload = {
  page: { title: 'About', updated_at: '2026-01-01T00:00:00.000Z' },
};

const postReadResponse: PostResponseType = {
  posts: [
    {
      id: 'post-1',
      uuid: 'uuid-1',
      url: '/hello/',
      slug: 'hello',
      title: 'Hello',
      updated_at: null,
    },
  ],
};

const pageReadResponse: PageResponseType = {
  pages: [
    {
      id: 'page-1',
      url: '/about/',
      slug: 'about',
      title: 'About',
      updated_at: null,
    },
  ],
};

const nullablePostReadResponse: PostResponseType = {
  posts: [
    {
      id: 'post-2',
      uuid: 'uuid-2',
      url: '/empty/',
      slug: 'empty',
      title: 'Empty',
      updated_at: null,
      published_at: null,
      feature_image: null,
      excerpt: null,
      custom_excerpt: null,
      email: null,
      newsletter: null,
      email_segment: null,
    },
  ],
};

const postWithAllCounts: Post = {
  id: 'post-3',
  uuid: 'uuid-3',
  url: '/counts/',
  slug: 'counts',
  title: 'Counts',
  count: {
    clicks: 1,
    conversions: 2,
    signups: 3,
    paid_conversions: 4,
    positive_feedback: 5,
    negative_feedback: 6,
  },
};

const pageWithPageCounts: Page = {
  id: 'page-2',
  url: '/page-counts/',
  slug: 'page-counts',
  title: 'Page counts',
  count: { signups: 1, paid_conversions: 2 },
};

const pageWithPostCount: Page = {
  id: 'page-3',
  url: '/invalid-count/',
  slug: 'invalid-count',
  title: 'Invalid count',
  count: {
    // @ts-expect-error click counts are not exposed by the pages endpoint
    clicks: 1,
  },
};

const postWithInputOnlyResponseField: Post = {
  id: 'post-4',
  uuid: 'uuid-4',
  url: '/input-only/',
  slug: 'input-only',
  title: 'Input only',
  // @ts-expect-error visibility_filter is accepted on writes but not emitted in responses
  visibility_filter: 'status:paid',
};

// Single-resource reads can flow directly into their edit mutations.
const postEditFromRead: EditPostPayload = { post: postReadResponse.posts[0] };
const pageEditFromRead: EditPagePayload = { page: pageReadResponse.pages[0] };

const revisionWithImageMetadata: PostRevision = {
  feature_image_alt: 'A ghost sign',
  feature_image_caption: 'Photo by Ghost',
  author: { profile_image: '/content/images/author.png' },
};

const schemaAlignedPostEdits: PostEditableData = {
  html: '<p>Hello</p>',
  feature_image: null,
  published_at: null,
  visibility: null,
  locale: null,
};

const schemaAlignedPageEdits: AddPagePayload['page'] = {
  title: 'About',
  html: '<p>About</p>',
  feature_image: null,
  published_at: null,
  visibility: null,
  locale: null,
};

const schemaAlignedRelations: PostEditableData = {
  authors: [{ email: 'author@example.com' }],
  tags: [{ name: 'News' }, { id: 'tag-1', slug: null }],
  tiers: [{ id: 'tier-1' }],
};

const postWithPageOnlyField: AddPostPayload = {
  post: {
    title: 'Hello',
    // @ts-expect-error page presentation settings are never writable on posts
    show_title_and_feature_image: false,
  },
};

const pageWithPostOnlyFields: AddPagePayload = {
  page: {
    title: 'About',
    // @ts-expect-error pages are never sent as email-only posts
    email_only: true,
  },
};

const pageWithEmailSubject: AddPagePayload = {
  page: {
    title: 'About',
    // @ts-expect-error pages have no email subject
    email_subject: 'About us',
  },
};

const sentPage: AddPagePayload = {
  page: {
    title: 'About',
    // @ts-expect-error sent is a post-only status
    status: 'sent',
  },
};

const postWithReadOnlyFields: AddPostPayload = {
  post: {
    title: 'Hello',
    // @ts-expect-error response URLs are not writable
    url: '/hello/',
  },
};

const postWithRevisions: AddPostPayload = {
  post: {
    title: 'Hello',
    // @ts-expect-error revision history is not writable through the post payload
    post_revisions: [],
  },
};

const invalidRelations: PostEditableData = {
  authors: [
    // @ts-expect-error author objects require id, slug, or email
    {},
  ],
  tags: [
    // @ts-expect-error tag objects require id, name, or a non-null slug
    { slug: null },
  ],
  tiers: [
    // @ts-expect-error tier objects require an id
    { name: 'Supporters' },
    // @ts-expect-error tier strings are discarded by the model relation handler
    'tier-slug',
  ],
};

describe('post request contract', () => {
  it('keeps the compile-time request and response contracts exercised', () => {
    for (const value of [
      postEditWithoutUpdatedAt,
      pageEditWithoutUpdatedAt,
      postCreateWithoutTitle,
      pageCreateWithoutTitle,
      postCreateWithUpdatedAt,
      pageCreateWithUpdatedAt,
      postEditFromRead,
      pageEditFromRead,
      nullablePostReadResponse,
      postWithAllCounts,
      pageWithPageCounts,
      pageWithPostCount,
      postWithInputOnlyResponseField,
      revisionWithImageMetadata,
      schemaAlignedPostEdits,
      schemaAlignedPageEdits,
      schemaAlignedRelations,
      invalidRelations,
      postWithPageOnlyField,
      pageWithPostOnlyFields,
      pageWithEmailSubject,
      sentPage,
      postWithReadOnlyFields,
      postWithRevisions,
      sharedTypeAssertions,
    ]) {
      expect(value).toBeTruthy();
    }
  });

  describe('query params', () => {
    it('requests both content formats on reads', () => {
      expect(buildPostReadParams()).toEqual({
        formats: 'mobiledoc,lexical',
      });
      expect(buildPostEditorReadParams()).toEqual({
        formats: 'mobiledoc,lexical',
        include: ALL_POST_INCLUDES,
      });
    });

    it('re-requests the full include list on writes', () => {
      expect(buildPostWriteParams()).toEqual({
        formats: POST_FORMATS,
        include:
          'tags,authors,authors.roles,email,tiers,newsletter,count.clicks,post_revisions,post_revisions.author',
      });
    });

    it('adds save_revision and convert_to_lexical only when requested', () => {
      expect(buildPostWriteParams({ saveRevision: true, convertToLexical: true })).toEqual({
        formats: POST_FORMATS,
        save_revision: 'true',
        convert_to_lexical: 'true',
        include: ALL_POST_INCLUDES,
      });

      expect(buildPostWriteParams({ saveRevision: false, convertToLexical: false })).toEqual({
        formats: POST_FORMATS,
        include: ALL_POST_INCLUDES,
      });
    });

    it('requests HTML-to-lexical conversion when sending an HTML source', () => {
      expect(buildPostWriteParams({ source: 'html' })).toEqual({
        formats: POST_FORMATS,
        source: 'html',
        include: ALL_POST_INCLUDES,
      });

      expect(buildPageWriteParams({ source: 'html' })).toEqual({
        formats: POST_FORMATS,
        source: 'html',
        include: ALL_POST_INCLUDES,
      });
    });

    it('sends newsletter and email segment when emailing a publish', () => {
      expect(buildPostWriteParams({ newsletter: 'weekly', emailSegment: 'status:free' })).toEqual({
        formats: POST_FORMATS,
        newsletter: 'weekly',
        email_segment: 'status:free',
        include: ALL_POST_INCLUDES,
      });
    });

    it('rewrites the "everyone" segment to all', () => {
      expect(
        buildPostWriteParams({ newsletter: 'weekly', emailSegment: 'status:free,status:-free' }),
      ).toEqual({
        formats: POST_FORMATS,
        newsletter: 'weekly',
        email_segment: 'all',
        include: ALL_POST_INCLUDES,
      });
    });

    it('only sends an email segment alongside a newsletter', () => {
      expect(buildPostWriteParams({ emailSegment: 'status:free' })).toEqual({
        formats: POST_FORMATS,
        include: ALL_POST_INCLUDES,
      });
    });

    it('never sends email delivery params for pages', () => {
      expect(buildPageWriteParams({ saveRevision: true })).toEqual({
        formats: POST_FORMATS,
        save_revision: 'true',
        include: ALL_POST_INCLUDES,
      });
    });
  });

  describe('payload shaping', () => {
    it('strips read-only and virtual fields from post payloads', () => {
      expect(
        serializePostPayload({
          id: 'post-1',
          title: 'Hello',
          lexical: '{"root":{}}',
          author_id: 'author-1',
          author: { id: 'author-1' },
          uuid: 'uuid-1',
          url: 'https://example.com/hello/',
          send_email_when_published: true,
          email_recipient_filter: 'all',
          email: { email_count: 1 },
          newsletter: { id: 'newsletter-1' },
          post_revisions: [{ id: 'revision-1' }],
        }),
      ).toEqual({
        id: 'post-1',
        title: 'Hello',
        lexical: '{"root":{}}',
      });
    });

    it('strips the page-only title/feature-image toggle from post payloads but keeps it for pages', () => {
      const data = { title: 'Hello', show_title_and_feature_image: false };

      expect(serializePostPayload(data)).toEqual({ title: 'Hello' });
      expect(serializePostPayload(data, 'page')).toEqual(data);
    });

    it('strips email fields from page payloads', () => {
      expect(
        serializePostPayload(
          { title: 'Hello', email_subject: 'Subject', email_only: false, email_id: 'email-1' },
          'page',
        ),
      ).toEqual({ title: 'Hello' });
    });

    it('drops visibility, filter and tiers when visibility is null', () => {
      expect(
        serializePostPayload({
          title: 'Hello',
          visibility: null,
          visibility_filter: 'label:vip',
          tiers: [{ id: 'tier-1' }],
        }),
      ).toEqual({ title: 'Hello' });
    });

    it('drops the visibility filter when visibility is tiers', () => {
      expect(
        serializePostPayload({
          title: 'Hello',
          visibility: 'tiers',
          visibility_filter: 'label:vip',
          tiers: [{ id: 'tier-1' }],
        }),
      ).toEqual({
        title: 'Hello',
        visibility: 'tiers',
        tiers: [{ id: 'tier-1' }],
      });
    });

    it('treats tiers visibility without tiers as unchanged visibility', () => {
      expect(serializePostPayload({ title: 'Hello', visibility: 'tiers', tiers: [] })).toEqual({
        title: 'Hello',
      });
    });

    it('keeps other visibility values untouched', () => {
      expect(serializePostPayload({ title: 'Hello', visibility: 'members', tiers: [] })).toEqual({
        title: 'Hello',
        visibility: 'members',
        tiers: [],
      });
    });
  });
});
