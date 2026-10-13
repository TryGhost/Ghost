import { describe, expect, it } from 'vitest';

import { PlaceSchema } from '../../src/bridge/index.ts';

const ID = '5ddc9141c35e7700383b2937';

describe('a place', () => {
  it('names a post, a page, a member or the apps list', () => {
    expect(PlaceSchema.parse({ post: { id: ID } })).toEqual({ post: { id: ID } });
    expect(PlaceSchema.parse({ page: { id: ID } })).toEqual({ page: { id: ID } });
    expect(PlaceSchema.parse({ member: { id: ID } })).toEqual({ member: { id: ID } });
    expect(PlaceSchema.parse({ apps: true })).toEqual({ apps: true });
  });

  it('refuses a place Admin does not know, or a path or URL in its place', () => {
    for (const place of [
      { settings: true },
      { url: 'https://evil.example/' },
      { path: '/settings/' },
      '/posts/',
      null,
      { apps: false },
    ]) {
      expect(PlaceSchema.safeParse(place).error?.issues[0]?.message).toBe(
        'Expected a place such as { post: { id } }, { page: { id } }, { member: { id } } or { apps: true }',
      );
    }
  });

  it('refuses an object naming more than one place', () => {
    expect(PlaceSchema.safeParse({ post: { id: ID }, apps: true }).success).toBe(false);
    expect(PlaceSchema.safeParse({ post: { id: ID }, page: { id: ID } }).success).toBe(false);
    expect(PlaceSchema.safeParse({ post: { id: ID, slug: 'x' } }).success).toBe(false);
  });

  it('only takes ObjectIds', () => {
    for (const id of [
      '1',
      ID.toUpperCase(),
      `${ID}0`,
      '../settings',
      'zzzzzzzzzzzzzzzzzzzzzzzz',
      42,
    ]) {
      expect(PlaceSchema.safeParse({ post: { id } }).success).toBe(false);
      expect(PlaceSchema.safeParse({ page: { id } }).success).toBe(false);
      expect(PlaceSchema.safeParse({ member: { id } }).success).toBe(false);
    }
  });
});
