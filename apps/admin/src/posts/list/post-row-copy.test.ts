import { describe, expect, it } from 'vitest';
import {
  getPostAuthorNames,
  getPostDateField,
  getPostDateTooltip,
  getPostMetaLine,
  getPostMetaParts,
  getPostStatusDetail,
  getPostStatusLabel,
} from './post-row-copy';
import type { PostListItem } from './hooks/use-posts-list';

// Every string a row renders, as pure functions. Ported from
// apps/ember-admin/app/components/posts-list/list-item-analytics.hbs and its
// helpers. Parity lives here, and it is the part hand-testing is worst at.

const post = (overrides: Partial<PostListItem> = {}): PostListItem => ({
  id: 'p1',
  uuid: 'u1',
  url: 'https://example.com/p1',
  slug: 'p1',
  title: 'A post',
  status: 'published',
  ...overrides,
});

describe('getPostAuthorNames', () => {
  it('joins author names with commas', () => {
    expect(
      getPostAuthorNames(
        post({
          authors: [
            { id: '1', name: 'Ada' },
            { id: '2', name: 'Grace' },
          ],
        }),
      ),
    ).toBe('Ada, Grace');
  });

  // Invited-but-not-yet-named staff have an email and no name.
  it('falls back to the email when an author has no name', () => {
    expect(
      getPostAuthorNames(
        post({
          authors: [{ id: '1', email: 'ada@example.com' }],
        }),
      ),
    ).toBe('ada@example.com');
  });

  it('is empty when there are no authors', () => {
    expect(getPostAuthorNames(post())).toBe('');
    expect(getPostAuthorNames(post({ authors: [] }))).toBe('');
  });
});

describe('getPostDateField', () => {
  // Drafts and scheduled posts have no meaningful published_at, so Ember
  // shows when they were last touched instead.
  it.each([
    ['draft', 'updated_at'],
    ['scheduled', 'updated_at'],
    ['published', 'published_at'],
    ['sent', 'published_at'],
  ] as const)('uses %s -> %s', (status, field) => {
    expect(getPostDateField(post({ status }))).toBe(field);
  });
});

describe('getPostMetaLine', () => {
  it('reads "By <authors>"', () => {
    expect(getPostMetaLine(post({ authors: [{ id: '1', name: 'Ada' }] }))).toEqual({
      byline: 'By Ada',
      primaryTagName: null,
    });
  });

  it('adds the primary tag when there is one', () => {
    expect(
      getPostMetaLine(
        post({
          authors: [{ id: '1', name: 'Ada' }],
          primary_tag: { id: 't1', name: 'News' },
        }),
      ),
    ).toEqual({ byline: 'By Ada', primaryTagName: 'News' });
  });

  it('omits the byline entirely when there are no authors', () => {
    expect(getPostMetaLine(post()).byline).toBeNull();
  });
});

describe('getPostMetaParts', () => {
  // Joined by the row, so a missing piece must drop its separator too -
  // otherwise a post with no authors reads " - 13 Jul 2026".
  it('joins byline, tag and date', () => {
    expect(
      getPostMetaParts(
        post({
          authors: [{ id: '1', name: 'Ada' }],
          primary_tag: { id: 't1', name: 'News' },
          published_at: '2026-07-13T09:00:00.000Z',
        }),
        { timezone: 'UTC', now: new Date('2026-08-04T09:00:00.000Z') },
      ),
    ).toEqual(['By Ada', 'in News', '13 Jul 2026']);
  });

  it('drops the byline and its separator when there are no authors', () => {
    expect(
      getPostMetaParts(
        post({
          published_at: '2026-07-13T09:00:00.000Z',
        }),
        { timezone: 'UTC', now: new Date('2026-08-04T09:00:00.000Z') },
      ),
    ).toEqual(['13 Jul 2026']);
  });

  it('is empty when there is nothing to say', () => {
    expect(getPostMetaParts(post({ status: 'draft' }), { timezone: 'UTC' })).toEqual([]);
  });
});

describe('getPostDateTooltip', () => {
  // Ember prefixes the title attribute so the date has context.
  it('says "Updated" for a draft', () => {
    expect(
      getPostDateTooltip(
        post({
          status: 'draft',
          updated_at: '2026-07-13T09:00:00.000Z',
        }),
        { timezone: 'UTC', now: new Date('2026-08-04T09:00:00.000Z') },
      ),
    ).toBe('Updated 09:00 (UTC) 13 Jul 2026');
  });

  it('says "Published" for a published post', () => {
    expect(
      getPostDateTooltip(
        post({
          status: 'published',
          published_at: '2026-07-13T09:00:00.000Z',
        }),
        { timezone: 'UTC', now: new Date('2026-08-04T09:00:00.000Z') },
      ),
    ).toContain('Published ');
  });

  it('is undefined with no date', () => {
    expect(getPostDateTooltip(post({ status: 'draft' }), { timezone: 'UTC' })).toBeUndefined();
  });
});

describe('getPostStatusLabel', () => {
  it.each([
    ['draft', 'Draft'],
    ['scheduled', 'Scheduled'],
    ['published', 'Published'],
    ['sent', 'Sent'],
  ] as const)('labels %s as "%s"', (status, label) => {
    expect(getPostStatusLabel(post({ status }))).toBe(label);
  });

  it('reports a failed newsletter on a published post', () => {
    expect(
      getPostStatusLabel(
        post({
          status: 'published',
          email: { status: 'failed', email_count: 10, opened_count: 0 },
        }),
      ),
    ).toBe('Published but failed to send newsletter');
  });

  // An email-only post that failed doesn't say "Sent" at all.
  it('reports a failed newsletter on an email-only post', () => {
    expect(
      getPostStatusLabel(
        post({
          status: 'sent',
          email: { status: 'failed', email_count: 10, opened_count: 0 },
        }),
      ),
    ).toBe('Failed to send newsletter');
  });

  it('notes that a published post was also emailed', () => {
    expect(
      getPostStatusLabel(
        post({
          status: 'published',
          email: { status: 'submitted', email_count: 10, opened_count: 0 },
        }),
      ),
    ).toBe('Published and sent');
  });
});

describe('getPostStatusDetail', () => {
  const timezone = 'UTC';

  it('has no detail for a draft', () => {
    expect(getPostStatusDetail(post({ status: 'draft' }), { timezone })).toBeNull();
  });

  // Revealed on hover in Ember.
  it('names the recipient count for a post that was emailed', () => {
    expect(
      getPostStatusDetail(
        post({
          status: 'published',
          email: { status: 'submitted', email_count: 1200, opened_count: 0 },
        }),
        { timezone },
      ),
    ).toBe('to 1,200 members');
  });

  it('uses the singular for a single recipient', () => {
    expect(
      getPostStatusDetail(
        post({
          status: 'sent',
          email: { status: 'submitted', email_count: 1, opened_count: 0 },
        }),
        { timezone },
      ),
    ).toBe('to 1 member');
  });

  it('has no detail for a published post that was never emailed', () => {
    expect(getPostStatusDetail(post({ status: 'published' }), { timezone })).toBeNull();
  });

  it('has no detail for a post whose newsletter failed', () => {
    expect(
      getPostStatusDetail(
        post({
          status: 'published',
          email: { status: 'failed', email_count: 10, opened_count: 0 },
        }),
        { timezone },
      ),
    ).toBeNull();
  });

  describe('scheduled posts', () => {
    const publishedAt = '2026-08-05T09:00:00.000Z';

    it('says when it will be published', () => {
      const detail = getPostStatusDetail(
        post({
          status: 'scheduled',
          published_at: publishedAt,
        }),
        { timezone, now: new Date('2026-08-04T09:00:00.000Z') },
      );

      expect(detail).toContain('to be published');
      expect(detail).toContain('tomorrow');
    });

    it('says "and sent" and names the segment when a newsletter is attached', () => {
      const detail = getPostStatusDetail(
        post({
          status: 'scheduled',
          published_at: publishedAt,
          newsletter: { id: 'n1' },
          email_segment: 'status:free',
        }),
        { timezone, now: new Date('2026-08-04T09:00:00.000Z') },
      );

      expect(detail).toContain('to be published and sent');
      expect(detail).toContain('to Free subscribers');
    });

    // Email-only posts are never "published".
    it('says "to be sent" for an email-only post', () => {
      const detail = getPostStatusDetail(
        post({
          status: 'scheduled',
          published_at: publishedAt,
          email_only: true,
          email_segment: 'all',
        }),
        { timezone, now: new Date('2026-08-04T09:00:00.000Z') },
      );

      expect(detail).toContain('to be sent');
      expect(detail).not.toContain('to be published');
    });
  });
});
