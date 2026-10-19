import { describe, expect, it } from 'vitest';
import { hasInProgressEmail } from './post-list-row-email-status-state';
import type { PostListItem } from '@/posts/list/hooks/use-posts-list';

const post = (overrides: Partial<PostListItem> = {}): PostListItem => ({
  id: 'post-1',
  uuid: 'post-uuid',
  title: 'A post',
  slug: 'a-post',
  url: 'https://example.com/a-post/',
  status: 'published',
  email: {
    id: 'email-1',
    status: 'submitting',
    email_count: 1000,
    opened_count: 0,
  },
  ...overrides,
});

describe('hasInProgressEmail', () => {
  it.each(['pending', 'submitting'] as const)('includes %s emails', (status) => {
    expect(
      hasInProgressEmail(
        post({ email: { id: 'email-1', status, email_count: 0, opened_count: 0 } }),
        'posts',
      ),
    ).toBe(true);
  });

  it('includes email-only sent posts', () => {
    expect(hasInProgressEmail(post({ status: 'sent', email_only: true }), 'posts')).toBe(true);
  });

  it.each([
    ['page', post(), 'pages'],
    ['draft', post({ status: 'draft' }), 'posts'],
    ['scheduled', post({ status: 'scheduled' }), 'posts'],
    [
      'missing email ID',
      post({ email: { status: 'submitting', email_count: 0, opened_count: 0 } }),
      'posts',
    ],
    [
      'submitted email',
      post({
        email: { id: 'email-1', status: 'submitted', email_count: 1000, opened_count: 0 },
      }),
      'posts',
    ],
    [
      'failed email',
      post({ email: { id: 'email-1', status: 'failed', email_count: 0, opened_count: 0 } }),
      'posts',
    ],
  ] as const)('excludes a %s', (_label, candidate, resource) => {
    expect(hasInProgressEmail(candidate, resource)).toBe(false);
  });
});
