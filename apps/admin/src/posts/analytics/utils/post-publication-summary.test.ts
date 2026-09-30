import { describe, expect, it } from 'vitest';
import { formatDisplayDate, formatDisplayTime } from '@tryghost/shade/utils';
import { getPostPublicationSummary } from '@/posts/analytics/utils/post-publication-summary';
import type { Post } from '@tryghost/admin-x-framework/api/posts';

const PUBLISHED_AT = '2026-09-19T10:00:00.000Z';
const TIMEZONE = 'Europe/London';
const ON = `on ${formatDisplayDate(PUBLISHED_AT, TIMEZONE)} at ${formatDisplayTime(PUBLISHED_AT, TIMEZONE)}`;

const publishedPost = (overrides: Partial<Post> = {}): Post =>
  ({
    id: 'post-1',
    status: 'published',
    published_at: PUBLISHED_AT,
    email: { email_count: 1000 },
    ...overrides,
  }) as Post;

const emailOnlyPost = (overrides: Partial<Post> = {}) =>
  publishedPost({ status: 'sent', email_only: true, ...overrides });

const sent = { isEmailSent: true, improveSendingUI: true, timezone: TIMEZONE };
const unsent = { ...sent, isEmailSent: false };

describe('getPostPublicationSummary', () => {
  it('has nothing to say before a post is published', () => {
    expect(getPostPublicationSummary(publishedPost({ published_at: null }), sent)).toBeNull();
  });

  it('says a post is only on the site until its send finishes', () => {
    expect(getPostPublicationSummary(publishedPost(), unsent)).toBe(`Published on your site ${ON}`);
  });

  it('adds the recipient count once the send finishes', () => {
    expect(getPostPublicationSummary(publishedPost(), sent)).toBe(
      `Published and sent to 1,000 members ${ON}`,
    );
    expect(
      getPostPublicationSummary(
        publishedPost({ email: { email_count: 1 } } as Partial<Post>),
        sent,
      ),
    ).toBe(`Published and sent to 1 member ${ON}`);
  });

  it('leaves the count out when there is none', () => {
    expect(
      getPostPublicationSummary(
        publishedPost({ email: { email_count: 0 } } as Partial<Post>),
        sent,
      ),
    ).toBe(`Published and sent ${ON}`);
  });

  it('holds an email-only publication summary back until the send finishes', () => {
    expect(getPostPublicationSummary(emailOnlyPost(), unsent)).toBeNull();
    expect(getPostPublicationSummary(emailOnlyPost(), sent)).toBe(`Sent to 1,000 members ${ON}`);
  });

  it('keeps the previous wording without the improved sending UI', () => {
    const flagOff = { ...unsent, improveSendingUI: false };

    expect(getPostPublicationSummary(emailOnlyPost(), flagOff)).toBe(`Sent ${ON}`);
    expect(getPostPublicationSummary(publishedPost(), { ...flagOff, isEmailSent: true })).toBe(
      `Published and sent ${ON}`,
    );
  });
});
