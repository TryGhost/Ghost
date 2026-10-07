import { describe, expect, it } from 'vitest';
import { parseSearchIndexItems } from './search-index';

describe('parseSearchIndexItems', () => {
  it('keeps global-search and link metadata while stripping unknown fields', () => {
    const items = parseSearchIndexItems([
      {
        id: 'p1',
        uuid: 'u-1',
        title: 'Hello',
        slug: 'hello',
        status: 'draft',
        url: 'https://site.test/hello/',
        visibility: 'public',
        published_at: '2026-01-05T10:00:00.000Z',
      },
      { id: 't1', slug: 'news', name: 'News' },
    ]);

    expect(items).toEqual([
      {
        id: 'p1',
        title: 'Hello',
        slug: 'hello',
        status: 'draft',
        url: 'https://site.test/hello/',
        visibility: 'public',
        published_at: '2026-01-05T10:00:00.000Z',
      },
      { id: 't1', slug: 'news', name: 'News' },
    ]);
  });

  it.each([
    ['a missing id', { title: 'Hello' }],
    ['a numeric id', { id: 1, title: 'Hello' }],
    ['a numeric title', { id: 'p1', title: 2024 }],
    ['a null name', { id: 't1', name: null }],
    ['a numeric URL', { id: 'u1', name: 'Jamie', url: 42 }],
    ['an invalid date type', { id: 'p1', title: 'Hello', published_at: [] }],
    ['a non-object entry', 'p1'],
  ])('drops entries with %s', (_description, entry) => {
    expect(parseSearchIndexItems([entry, { id: 'ok', title: 'Kept' }])).toEqual([
      { id: 'ok', title: 'Kept' },
    ]);
  });

  it('returns nothing for a response that is not a list', () => {
    expect(parseSearchIndexItems({ posts: [] })).toEqual([]);
  });
});
