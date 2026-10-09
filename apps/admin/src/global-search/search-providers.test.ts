import type { SearchIndexItem } from '@/shared/search-index';
import { describe, expect, it } from 'vitest';
import { billingSearchSource } from './billing-source';
import { contentSearchSource } from './content-sources';
import {
  createBasicSearchProvider,
  createFlexSearchProvider,
  createSearchProvider,
} from './search-providers';
import type { SearchResultGroup, SearchSource } from './search-source';

const content = {
  users: [{ id: 'u1', slug: 'first-user', name: 'First user' }],
  tags: [{ id: 't1', slug: 'first-tag', name: 'First tag' }],
  posts: [
    { id: 'p1', title: 'First post', status: 'published' },
    { id: 'p2', title: 'Second post', status: 'draft' },
    { id: 'p3', title: 'Third post', status: 'scheduled' },
  ],
  pages: [{ id: 'g1', title: 'First page', status: 'draft' }],
} satisfies Record<string, SearchIndexItem[]>;

const contentSources = (posts: SearchIndexItem[] = content.posts) => [
  contentSearchSource('users', content.users),
  contentSearchSource('tags', content.tags),
  contentSearchSource('posts', posts),
  contentSearchSource('pages', content.pages),
];

const billing = billingSearchSource({
  groupName: 'Acme Hosting',
  items: [
    {
      id: 'change-plan',
      title: 'Change plan',
      path: '/plans',
      keywords: 'billing subscription plan price',
    },
    {
      id: 'setup-custom-domain',
      title: 'Set up a custom domain',
      path: '/domain',
      keywords: 'billing domain dns cname',
    },
    {
      id: 'request-backup',
      title: 'Request backup',
      path: '/backups',
      keywords: 'billing backup restore data',
    },
  ],
});

const withBilling = (posts?: SearchIndexItem[]) => {
  const [users, tags, ...rest] = contentSources(posts);
  return [users, tags, billing, ...rest];
};

const postsTitled = (titles: string[]): SearchIndexItem[] =>
  titles.map((title, index) => ({ id: `p${index}`, title, status: 'published' }));

const headings = (groups: SearchResultGroup[]) => groups.map((group) => group.heading);
const titles = (groups: SearchResultGroup[], heading: string) =>
  groups.find((group) => group.heading === heading)?.items.map((item) => item.title);

describe.each([
  ['flex', createFlexSearchProvider],
  ['basic', createBasicSearchProvider],
])('%s search provider', (_name, create) => {
  const search = (term: string) => create(contentSources()).search(term);

  it('groups matches in source order', () => {
    const results = search('first');

    expect(headings(results)).toEqual(['Staff', 'Tags', 'Posts', 'Pages']);
    expect(results.map((group) => `${group.id}:${group.items[0].id}`)).toEqual([
      'users:first-user',
      'tags:first-tag',
      'posts:p1',
      'pages:g1',
    ]);
  });

  it('orders a group with its source compare', () => {
    expect(titles(search('post'), 'Posts')).toEqual(['Third post', 'Second post', 'First post']);
  });

  it('ignores case', () => {
    expect(headings(search('FIRST'))).toEqual(['Staff', 'Tags', 'Posts', 'Pages']);
  });

  it.each(['', ' '])('returns nothing for the blank term %j', (term) => {
    expect(search(term)).toEqual([]);
  });

  it('returns nothing when nothing matches', () => {
    expect(search('nothing matches this')).toEqual([]);
  });

  it('caps each group at 100 results', () => {
    const posts = postsTitled(Array.from({ length: 150 }, (_, index) => `Post ${index}`));
    const [group] = create([contentSearchSource('posts', posts)]).search('post');

    expect(group.items).toHaveLength(100);
  });

  it('returns the source items themselves', () => {
    const run = () => {};
    const source: SearchSource = {
      id: 'actions',
      heading: 'Actions',
      isLoading: false,
      items: [{ kind: 'action', id: 'toggle', title: 'Toggle', run }],
    };

    const [group] = create([source]).search('toggle');

    expect(group.items[0]).toBe(source.items[0]);
  });

  describe('billing results', () => {
    const searchBilling = (term: string) => create(withBilling()).search(term);

    it('lists billing results before content results', () => {
      const groups = create(withBilling(postsTitled(['Backup post']))).search('backup');

      expect(headings(groups)).toEqual(['Acme Hosting', 'Posts']);
      expect(groups[0]).toMatchObject({
        id: 'billing',
        items: [{ id: 'request-backup', title: 'Request backup', to: '/pro/backups' }],
      });
    });

    it('lists billing results in the configured order', () => {
      expect(titles(searchBilling('billing'), 'Acme Hosting')).toEqual([
        'Change plan',
        'Set up a custom domain',
        'Request backup',
      ]);
    });

    it('matches billing results on keywords', () => {
      expect(titles(searchBilling('dns'), 'Acme Hosting')).toEqual(['Set up a custom domain']);
      expect(titles(searchBilling('price'), 'Acme Hosting')).toEqual(['Change plan']);
    });
  });
});

describe('flex search provider matching', () => {
  const search = (term: string, posts: SearchIndexItem[] = content.posts) =>
    titles(createFlexSearchProvider([contentSearchSource('posts', posts)]).search(term), 'Posts');

  it('matches the start of any word', () => {
    expect(search('sec')).toEqual(['Second post']);
    expect(search('pos')).toEqual(['Third post', 'Second post', 'First post']);
  });

  it('does not match inside a word', () => {
    expect(search('econd')).toBeUndefined();
  });

  it('matches every word of a multi-word term in any order', () => {
    expect(search('post second')).toEqual(['Second post']);
  });

  it('keeps numbers whole', () => {
    const posts = postsTitled(['Top100 tips', 'Best of 2024']);

    expect(search('top1', posts)).toEqual(['Top100 tips']);
    expect(search('4', posts)).toBeUndefined();
  });

  it('matches keywords after titles', () => {
    const source: SearchSource = {
      id: 'shortcuts',
      heading: 'Shortcuts',
      isLoading: false,
      items: [
        { kind: 'navigate', id: 'a', title: 'Alpha', keywords: 'beta', to: '/a' },
        { kind: 'navigate', id: 'b', title: 'Beta', to: '/b' },
      ],
    };

    expect(titles(createFlexSearchProvider([source]).search('beta'), 'Shortcuts')).toEqual([
      'Beta',
      'Alpha',
    ]);
  });

  it('does not fold diacritics or collapse repeated letters', () => {
    const posts = postsTitled(['Café', 'Coffee', 'Apple']);

    expect(search('cafe', posts)).toBeUndefined();
    expect(search('cofee', posts)).toBeUndefined();
    expect(search('aa', posts)).toBeUndefined();
  });
});

describe('basic search provider matching', () => {
  const search = (term: string) =>
    titles(createBasicSearchProvider(contentSources()).search(term), 'Posts');

  it('matches anywhere inside the title', () => {
    expect(search('econd')).toEqual(['Second post']);
  });

  it('matches the term as one contiguous string', () => {
    expect(search('post second')).toBeUndefined();
    expect(search('second post')).toEqual(['Second post']);
  });

  it('matches anywhere inside the keywords', () => {
    expect(titles(createBasicSearchProvider([billing]).search('cnam'), 'Acme Hosting')).toEqual([
      'Set up a custom domain',
    ]);
  });

  it('sorts by status before capping', () => {
    const posts = [
      ...postsTitled(Array.from({ length: 150 }, (_, index) => `Post ${index}`)),
      { id: 'd1', title: 'Draft post', status: 'draft' },
    ];
    const [group] = createBasicSearchProvider([contentSearchSource('posts', posts)]).search('post');

    expect(group.items).toHaveLength(100);
    expect(group.items[0].title).toBe('Draft post');
  });
});

describe('createSearchProvider', () => {
  // only the basic provider matches inside a word
  const matchesInsideWords = (locale: string | null | undefined) =>
    createSearchProvider(
      [contentSearchSource('posts', postsTitled(['Second post']))],
      locale,
    ).search('econd').length > 0;

  it.each(['en', 'en-GB', 'EN', null, undefined])('uses FlexSearch for the %s locale', (locale) => {
    expect(matchesInsideWords(locale)).toBe(false);
  });

  it.each(['de', 'fr-CA', 'ja', ''])('uses substring matching for the %j locale', (locale) => {
    expect(matchesInsideWords(locale)).toBe(true);
  });
});
