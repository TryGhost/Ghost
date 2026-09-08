import { describe, expect, it } from 'vitest';
import type { PostRevision } from '@tryghost/admin-x-framework/api/posts';
import type { EditorRecord } from '@/editor/session/projection';
import { DELETED_AUTHOR, canViewPostHistory, revisionDate, revisionEntries } from './post-history';

function record(overrides: Partial<EditorRecord> = {}): EditorRecord {
  return {
    id: 'post-1',
    title: 'A post',
    slug: 'a-post',
    status: 'draft',
    lexical: '{}',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as EditorRecord;
}

function revision(overrides: Partial<PostRevision> = {}): PostRevision {
  return {
    id: 'rev-1',
    lexical: '{}',
    title: 'A version',
    post_status: 'draft',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('canViewPostHistory', () => {
  it('refuses a post that has never been saved', () => {
    expect(canViewPostHistory(undefined)).toBe(false);
  });

  it('refuses a post with no lexical content', () => {
    expect(canViewPostHistory(record({ lexical: null }))).toBe(false);
  });

  it('allows a post whose lexical document is empty', () => {
    expect(canViewPostHistory(record({ lexical: '' }))).toBe(true);
  });

  it('allows every unpublished and unsent status', () => {
    expect(canViewPostHistory(record({ status: 'draft' }))).toBe(true);
    expect(canViewPostHistory(record({ status: 'scheduled' }))).toBe(true);
  });

  it('allows a published or sent post that also has a web version', () => {
    expect(canViewPostHistory(record({ status: 'published', email_only: false }))).toBe(true);
    expect(canViewPostHistory(record({ status: 'sent', email_only: false }))).toBe(true);
  });

  it('refuses a published or sent post that only went out as an email', () => {
    expect(canViewPostHistory(record({ status: 'published', email_only: true }))).toBe(false);
    expect(canViewPostHistory(record({ status: 'sent', email_only: true }))).toBe(false);
  });
});

describe('revisionEntries', () => {
  it.each([null, {}, [null], [{ title: 42 }]])('ignores malformed revision data: %j', (input) => {
    expect(revisionEntries(input)).toEqual([]);
  });

  it('orders the versions newest first', () => {
    const entries = revisionEntries([
      revision({ id: 'old', created_at: '2026-01-01T00:00:00.000Z' }),
      revision({ id: 'new', created_at: '2026-03-01T00:00:00.000Z' }),
      revision({ id: 'middle', created_at: '2026-02-01T00:00:00.000Z' }),
    ]);

    expect(entries.map((entry) => entry.id)).toEqual(['new', 'middle', 'old']);
  });

  it('labels the newest version', () => {
    const entries = revisionEntries([
      revision({ id: 'a', created_at: '2026-01-01T00:00:00.000Z' }),
      revision({ id: 'b', created_at: '2026-02-01T00:00:00.000Z' }),
    ]);

    expect(entries[0].tags).toEqual(['latest']);
    expect(entries[1].tags).toEqual([]);
  });

  it('labels the version that first took the post to published', () => {
    const entries = revisionEntries([
      revision({ id: 'draft', post_status: 'draft', created_at: '2026-01-01T00:00:00.000Z' }),
      revision({
        id: 'published',
        post_status: 'published',
        created_at: '2026-02-01T00:00:00.000Z',
      }),
      revision({
        id: 'edit',
        post_status: 'published',
        created_at: '2026-03-01T00:00:00.000Z',
      }),
    ]);

    expect(entries.map((entry) => entry.tags)).toEqual([['latest'], ['published'], []]);
  });

  it('labels an unpublish, and carries both labels when it is also the newest', () => {
    const entries = revisionEntries([
      revision({ id: 'earlier', created_at: '2026-01-01T00:00:00.000Z' }),
      revision({
        id: 'unpublished',
        reason: 'unpublished',
        created_at: '2026-02-01T00:00:00.000Z',
      }),
    ]);

    expect(entries[0].tags).toEqual(['latest', 'unpublished']);
  });

  it('names an author the API no longer resolves', () => {
    const [entry] = revisionEntries([revision({ author: null })]);

    expect(entry.authorName).toBe(DELETED_AUTHOR);
  });

  it('reads the fields a restore writes back', () => {
    const [entry] = revisionEntries([
      revision({
        title: 'Older title',
        custom_excerpt: 'Older excerpt',
        feature_image: 'https://example.com/old.jpg',
        feature_image_alt: 'Old alt',
        feature_image_caption: '<b>Old caption</b>',
      }),
    ]);

    expect(entry).toMatchObject({
      title: 'Older title',
      customExcerpt: 'Older excerpt',
      featureImage: 'https://example.com/old.jpg',
      featureImageAlt: 'Old alt',
      featureImageCaption: '<b>Old caption</b>',
    });
  });

  it('has nothing to show when the post carries no versions', () => {
    expect(revisionEntries()).toEqual([]);
  });
});

describe('revisionDate', () => {
  it.each([null, 42, 'Invalid/Zone'])('uses UTC for an invalid timezone: %j', (timezone) => {
    expect(revisionDate('2026-03-04T22:30:00.000Z', timezone)).toBe('4 Mar 2026, 22:30');
  });
  it('reads in the site timezone', () => {
    expect(revisionDate('2026-03-04T22:30:00.000Z', 'Etc/UTC')).toBe('4 Mar 2026, 22:30');
    expect(revisionDate('2026-03-04T22:30:00.000Z', 'Australia/Sydney')).toBe('5 Mar 2026, 09:30');
  });

  it('says nothing for a date it cannot read', () => {
    expect(revisionDate('not a date', 'Etc/UTC')).toBe('');
  });
});
