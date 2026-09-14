import { describe, expect, it } from 'vitest';
import {
  confirmationResponseSchema,
  publishedPostCountResponseSchema,
} from '@/editor/publish/api-response-schemas';

describe('publish API response schemas', () => {
  it('accepts the confirmation projection used by the email poller', () => {
    expect(
      confirmationResponseSchema.parse({
        posts: [
          {
            id: 'post-1',
            status: 'published',
            email: {
              id: 'email-1',
              email_count: 10,
              opened_count: 2,
              status: 'submitted',
            },
          },
        ],
      }),
    ).toMatchObject({ posts: [{ status: 'published', email: { status: 'submitted' } }] });
  });

  it.each([
    ['an empty post collection', { posts: [] }],
    ['an unknown post status', { posts: [{ status: 'publishing', email: null }] }],
    [
      'an incomplete email record',
      { posts: [{ status: 'published', email: { id: 'email-1', status: 'submitted' } }] },
    ],
  ])('rejects %s', (_name, response) => {
    expect(confirmationResponseSchema.safeParse(response).success).toBe(false);
  });

  it('accepts a non-negative published post total', () => {
    expect(
      publishedPostCountResponseSchema.parse({ meta: { pagination: { total: 41 } } }),
    ).toMatchObject({ meta: { pagination: { total: 41 } } });
  });

  it.each([
    ['a missing total', { meta: { pagination: {} } }],
    ['a string total', { meta: { pagination: { total: '41' } } }],
    ['a negative total', { meta: { pagination: { total: -1 } } }],
  ])('rejects %s', (_name, response) => {
    expect(publishedPostCountResponseSchema.safeParse(response).success).toBe(false);
  });
});
