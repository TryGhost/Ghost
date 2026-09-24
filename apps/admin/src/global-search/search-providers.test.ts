import { describe, expect, it } from 'vitest';
import {
  type SearchProvider,
  createBasicSearchProvider,
  createFlexSearchProvider,
  createSearchProvider,
} from './search-providers';
import { type SearchIndexItem, type SearchResultGroup, getSearchables } from './searchables';

const users: SearchIndexItem[] = [
  { id: 'u1', slug: 'first-user', name: 'First user', url: 'https://site.test/author/first-user/' },
];
const tags: SearchIndexItem[] = [
  { id: 't1', slug: 'first-tag', name: 'First tag', url: 'https://site.test/tag/first-tag/' },
];
const posts: SearchIndexItem[] = [
  {
    id: 'p1',
    title: 'First post',
    url: 'https://site.test/first-post/',
    status: 'published',
    visibility: 'members',
    published_at: '2024-05-08T16:21:07.000Z',
  },
  { id: 'p2', title: 'Second post', status: 'draft' },
  { id: 'p3', title: 'Third post', status: 'scheduled' },
];
const pages: SearchIndexItem[] = [
  { id: 'g1', title: 'First page', url: 'https://site.test/first-page/', status: 'draft' },
];

const billingSearch = {
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
};

type CreateProvider = typeof createFlexSearchProvider;

function loadedProvider(create: CreateProvider, hostSettings?: { billing?: { search?: unknown } }) {
  const provider = create(getSearchables(hostSettings));
  provider.setContent('user', users);
  provider.setContent('tag', tags);
  provider.setContent('post', posts);
  provider.setContent('page', pages);
  return provider;
}

const groupNames = (groups: SearchResultGroup[]) => groups.map((group) => group.groupName);
const titles = (groups: SearchResultGroup[], groupName: string) =>
  groups.find((group) => group.groupName === groupName)?.options.map((option) => option.title);

describe.each([
  ['flex', createFlexSearchProvider],
  ['basic', createBasicSearchProvider],
])('%s search provider', (_name, create) => {
  it('groups matches in display order with their urls', () => {
    const results = loadedProvider(create).search('first');

    expect(groupNames(results)).toEqual(['Staff', 'Tags', 'Posts', 'Pages']);
    expect(results.map((group) => group.options[0].url)).toEqual([
      'https://site.test/author/first-user/',
      'https://site.test/tag/first-tag/',
      'https://site.test/first-post/',
      'https://site.test/first-page/',
    ]);
    expect(results.map((group) => group.options[0].id)).toEqual([
      'user.first-user',
      'tag.first-tag',
      'post.p1',
      'page.g1',
    ]);
  });

  it('carries post publishing fields', () => {
    const [group] = loadedProvider(create).search('first post');

    expect(group.options[0]).toMatchObject({
      status: 'published',
      visibility: 'members',
      publishedAt: '2024-05-08T16:21:07.000Z',
    });
  });

  it('orders posts scheduled, then draft, then published', () => {
    expect(titles(loadedProvider(create).search('post'), 'Posts')).toEqual([
      'Third post',
      'Second post',
      'First post',
    ]);
  });

  it('ignores case', () => {
    expect(groupNames(loadedProvider(create).search('FIRST'))).toEqual([
      'Staff',
      'Tags',
      'Posts',
      'Pages',
    ]);
  });

  it.each(['', '   '])('returns nothing for the blank term %j', (term) => {
    expect(loadedProvider(create).search(term)).toEqual([]);
  });

  it('returns nothing when nothing matches', () => {
    expect(loadedProvider(create).search('nothing matches this')).toEqual([]);
  });

  it('replaces content for a model', () => {
    const provider = loadedProvider(create);
    provider.setContent('post', [{ id: 'p9', title: 'Replacement post', status: 'published' }]);

    expect(titles(provider.search('post'), 'Posts')).toEqual(['Replacement post']);
    expect(groupNames(provider.search('first'))).toEqual(['Staff', 'Tags', 'Pages']);
  });

  describe('billing results', () => {
    const provider = () => loadedProvider(create, { billing: { search: billingSearch } });

    it('lists billing results before content results', () => {
      const results = create(getSearchables({ billing: { search: billingSearch } }));
      results.setContent('post', [{ id: 'p1', title: 'Backup post', status: 'published' }]);

      const groups = results.search('backup');

      expect(groupNames(groups)).toEqual(['Acme Hosting', 'Posts']);
      expect(groups[0]).toMatchObject({ groupKey: 'billing' });
      expect(groups[0].options[0]).toMatchObject({
        id: 'pro-page.request-backup',
        title: 'Request backup',
        path: '/backups',
      });
    });

    it('lists billing results in the configured order', () => {
      expect(titles(provider().search('billing'), 'Acme Hosting')).toEqual([
        'Change plan',
        'Set up a custom domain',
        'Request backup',
      ]);
    });

    it('matches billing results on keywords', () => {
      expect(titles(provider().search('dns'), 'Acme Hosting')).toEqual(['Set up a custom domain']);
      expect(titles(provider().search('price'), 'Acme Hosting')).toEqual(['Change plan']);
    });

    it('keeps configured items when content is set for the billing model', () => {
      const results = provider();
      results.setContent('pro-page', [{ id: 'x', title: 'Injected billing' }]);

      expect(titles(results.search('billing'), 'Acme Hosting')).toHaveLength(3);
      expect(results.search('injected')).toEqual([]);
    });
  });
});

describe('flex search provider matching', () => {
  const search = (term: string) =>
    titles(loadedProvider(createFlexSearchProvider).search(term), 'Posts');

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

  it('does not fold diacritics or collapse repeated letters', () => {
    const provider = createFlexSearchProvider(getSearchables());
    provider.setContent('post', [
      { id: 'p1', title: 'Café', status: 'published' },
      { id: 'p2', title: 'Coffee', status: 'published' },
      { id: 'p3', title: 'Apple', status: 'published' },
    ]);

    expect(titles(provider.search('cafe'), 'Posts')).toBeUndefined();
    expect(titles(provider.search('cofee'), 'Posts')).toBeUndefined();
    expect(titles(provider.search('aa'), 'Posts')).toBeUndefined();
  });
});

describe('basic search provider matching', () => {
  const search = (term: string) =>
    titles(loadedProvider(createBasicSearchProvider).search(term), 'Posts');

  it('matches anywhere inside the title', () => {
    expect(search('econd')).toEqual(['Second post']);
  });

  it('matches the term as one contiguous string', () => {
    expect(search('post second')).toBeUndefined();
    expect(search('second post')).toEqual(['Second post']);
  });
});

describe('createSearchProvider', () => {
  // only the basic provider matches inside a word
  const usesBasicProvider = (provider: SearchProvider) => {
    provider.setContent('post', [{ id: 'p1', title: 'Second post', status: 'published' }]);
    return provider.search('econd').length > 0;
  };

  it.each(['en', 'en-GB', 'EN', null, undefined])('uses FlexSearch for the %s locale', (locale) => {
    expect(usesBasicProvider(createSearchProvider(getSearchables(), locale))).toBe(false);
  });

  it.each(['de', 'fr-CA', 'ja', ''])('uses substring matching for the %j locale', (locale) => {
    expect(usesBasicProvider(createSearchProvider(getSearchables(), locale))).toBe(true);
  });
});
