import { describe, expect, it } from 'vitest';
import { publishedPostCountResponseSchema } from '@/editor/publish/api-response-schemas';

describe('publish API response schemas', () => {
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
