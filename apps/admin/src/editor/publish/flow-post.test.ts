import { describe, expect, it } from 'vitest';
import type { PageEditorRecord } from '@tryghost/admin-x-framework/api/pages';
import type { PostEditorRecord } from '@tryghost/admin-x-framework/api/posts';
import type { EditorSaveSnapshot } from '@/editor/session/snapshot';
import { buildPublishFlowPost } from './flow-post';

const UPDATED_AT = '2026-01-01T00:00:00.000Z';

function snapshot(overrides: Partial<EditorSaveSnapshot> = {}): EditorSaveSnapshot {
  return {
    id: 'post-1',
    updatedAt: UPDATED_AT,
    status: 'draft',
    publishedAt: null,
    title: 'Hello from React',
    slug: 'hello-from-react',
    slugIsCustom: false,
    isDirty: false,
    titleDirty: false,
    changedSinceLastRevision: false,
    version: 0,
    ...overrides,
  } as EditorSaveSnapshot;
}

function record(overrides: Partial<PostEditorRecord> = {}): PostEditorRecord {
  return {
    id: 'post-1',
    uuid: 'uuid-1',
    url: 'https://example.com/hello-from-react/',
    slug: 'hello-from-react',
    title: 'Hello from React',
    status: 'draft',
    visibility: 'public',
    updated_at: UPDATED_AT,
    published_at: null,
    custom_excerpt: 'A short summary',
    feature_image: 'https://example.com/feature.jpg',
    lexical: '{"root":{}}',
    ...overrides,
  };
}

const NEWSLETTER = { slug: 'weekly', name: 'Weekly', status: 'active' };

const CASES = [
  {
    name: 'a draft',
    snapshot: snapshot(),
    record: record(),
    expected: {
      status: 'draft',
      publishedAt: null,
      newsletter: null,
      emailOnly: false,
      email: null,
      emailCreatedAt: null,
    },
  },
  {
    name: 'a published post that emailed',
    snapshot: snapshot({ status: 'published', publishedAt: '2026-02-01T10:00:00.000Z' }),
    record: record({
      status: 'published',
      published_at: '2026-02-01T10:00:00.000Z',
      newsletter: NEWSLETTER,
      email_segment: 'status:free',
      email: {
        id: 'email-1',
        created_at: '2026-02-01T10:00:05.000Z',
        email_count: 20,
        opened_count: 3,
        status: 'submitted',
      },
    }),
    expected: {
      status: 'published',
      publishedAt: '2026-02-01T10:00:00.000Z',
      newsletter: 'weekly',
      newsletterName: 'Weekly',
      newsletterStatus: 'active',
      emailSegment: 'status:free',
      emailOnly: false,
      emailCreatedAt: '2026-02-01T10:00:05.000Z',
    },
  },
  {
    name: 'a scheduled post',
    snapshot: snapshot({ status: 'scheduled', publishedAt: '2026-03-01T10:00:00.000Z' }),
    record: record({
      status: 'scheduled',
      published_at: '2026-03-01T10:00:00.000Z',
      newsletter: { slug: 'weekly', name: 'Weekly', status: 'archived' },
    }),
    expected: {
      status: 'scheduled',
      publishedAt: '2026-03-01T10:00:00.000Z',
      newsletter: 'weekly',
      newsletterStatus: 'archived',
      email: null,
    },
  },
  {
    name: 'an email-only sent post',
    snapshot: snapshot({ status: 'sent', publishedAt: '2026-04-01T10:00:00.000Z' }),
    record: record({
      status: 'sent',
      published_at: '2026-04-01T10:00:00.000Z',
      email_only: true,
      newsletter: NEWSLETTER,
      email: { id: 'email-2', email_count: 5, opened_count: 0, status: 'submitted' },
    }),
    expected: {
      status: 'sent',
      emailOnly: true,
      newsletter: 'weekly',
      emailCreatedAt: null,
    },
  },
  {
    name: 'a tiers-restricted draft',
    snapshot: snapshot(),
    record: record({
      visibility: 'tiers',
      tiers: [
        { id: 'tier-1', slug: 'gold' },
        { id: 'tier-2', slug: null },
      ],
    }),
    expected: { visibility: 'tiers', tiers: [{ slug: 'gold' }] },
  },
] as const;

describe('buildPublishFlowPost', () => {
  it.each(CASES)('projects $name', ({ snapshot: snap, record: rec, expected }) => {
    const post = buildPublishFlowPost({ snapshot: snap, record: rec, displayName: 'post' });

    expect(post).toMatchObject(expected);
    expect(post.id).toBe('post-1');
    expect(post.displayName).toBe('post');
  });

  it('reads status, publish time and title from the engine rather than the record', () => {
    const post = buildPublishFlowPost({
      // The record has not been read back yet, so it still describes the draft.
      snapshot: snapshot({
        status: 'published',
        publishedAt: '2026-05-01T10:00:00.000Z',
        title: 'Typed since',
      }),
      record: record(),
      displayName: 'post',
    });

    expect(post.status).toBe('published');
    expect(post.publishedAt).toBe('2026-05-01T10:00:00.000Z');
    expect(post.title).toBe('Typed since');
  });

  it('prefers the unsaved body over the record it was loaded with', () => {
    const post = buildPublishFlowPost({
      snapshot: snapshot(),
      record: record(),
      displayName: 'post',
      lexical: '{"root":{"unsaved":true}}',
    });

    expect(post.lexical).toBe('{"root":{"unsaved":true}}');
  });

  it('describes a created post the editor has not read back yet', () => {
    const post = buildPublishFlowPost({ snapshot: snapshot(), displayName: 'post' });

    expect(post).toMatchObject({
      id: 'post-1',
      status: 'draft',
      title: 'Hello from React',
      url: null,
      newsletter: null,
      tiers: [],
      email: null,
    });
  });

  it('leaves a page without the email fields only posts carry', () => {
    const page: PageEditorRecord = {
      id: 'page-1',
      uuid: 'uuid-2',
      url: 'https://example.com/about/',
      slug: 'about',
      title: 'About',
      status: 'draft',
      visibility: 'public',
      updated_at: UPDATED_AT,
    };

    const post = buildPublishFlowPost({ snapshot: snapshot(), record: page, displayName: 'page' });

    expect(post).toMatchObject({
      displayName: 'page',
      newsletter: null,
      emailSegment: null,
      emailOnly: false,
      email: null,
    });
  });
});
