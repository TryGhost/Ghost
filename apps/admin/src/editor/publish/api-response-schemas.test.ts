import { describe, expect, it } from 'vitest';
import {
  postEmailResponseSchema,
  publishedPostCountResponseSchema,
} from '@/editor/publish/api-response-schemas';

describe('publish API response schemas', () => {
  it('accepts a post read with or without its email', () => {
    expect(
      postEmailResponseSchema.parse({ posts: [{ id: 'post-1', email: { id: 'email-1' } }] }),
    ).toMatchObject({ posts: [{ email: { id: 'email-1' } }] });
    expect(postEmailResponseSchema.parse({ posts: [{ id: 'post-1', email: null }] })).toBeTruthy();
  });

  it.each([
    ['an empty post collection', { posts: [] }],
    ['an email without an id', { posts: [{ email: { status: 'failed' } }] }],
  ])('rejects %s', (_name, response) => {
    expect(postEmailResponseSchema.safeParse(response).success).toBe(false);
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
