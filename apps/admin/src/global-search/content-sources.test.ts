import { describe, expect, it } from 'vitest';
import { compareByStatus, contentSearchSource } from './content-sources';
import type { SearchItem } from './search-source';

describe('contentSearchSource', () => {
  it.each([
    ['posts', { id: 'p1', title: 'Post' }, 'p1', '/editor/post/p1'],
    ['pages', { id: 'g1', title: 'Page' }, 'g1', '/editor/page/g1'],
    [
      'users',
      { id: 'u1', slug: 'jamie-larson', name: 'Jamie' },
      'jamie-larson',
      '/settings/staff/jamie-larson',
    ],
    ['tags', { id: 't1', slug: 'news', name: 'News' }, 'news', '/tags/news'],
  ] as const)('sends %s to their screen', (key, entry, id, to) => {
    expect(contentSearchSource(key, [entry]).items).toMatchObject([{ kind: 'navigate', id, to }]);
  });

  it('encodes the route key', () => {
    const [item] = contentSearchSource('tags', [{ id: 't1', slug: 'a/b', name: 'A/B' }]).items;

    expect(item).toMatchObject({ to: '/tags/a%2Fb' });
  });

  it('keeps post and page statuses for their badges', () => {
    const [item] = contentSearchSource('posts', [
      { id: 'p1', title: 'Post', status: 'draft' },
    ]).items;

    expect(item.status).toBe('draft');
  });
});

describe('compareByStatus', () => {
  const item = (title: string, status?: string): SearchItem => ({
    kind: 'navigate',
    id: title,
    title,
    status,
    to: '/',
  });

  it('orders scheduled, draft, published, sent, then anything else', () => {
    const items = [
      item('other', 'unknown'),
      item('sent', 'sent'),
      item('published', 'published'),
      item('draft', 'draft'),
      item('scheduled', 'scheduled'),
    ];

    expect(items.sort(compareByStatus).map(({ title }) => title)).toEqual([
      'scheduled',
      'draft',
      'published',
      'sent',
      'other',
    ]);
  });

  it('keeps the incoming order within a status', () => {
    const items = [item('b', 'draft'), item('a', 'draft')];

    expect(items.sort(compareByStatus).map(({ title }) => title)).toEqual(['b', 'a']);
  });

  it('only sorts posts and pages', () => {
    expect(contentSearchSource('posts').compare).toBe(compareByStatus);
    expect(contentSearchSource('pages').compare).toBe(compareByStatus);
    expect(contentSearchSource('tags').compare).toBeUndefined();
    expect(contentSearchSource('users').compare).toBeUndefined();
  });
});
