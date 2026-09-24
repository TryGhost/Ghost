import { describe, expect, it } from 'vitest';
import {
  type SearchContent,
  createBasicSearchProvider,
  createFlexSearchProvider,
  createSearchProvider,
} from './search-providers';
import { type SearchIndexItem, type SearchResultGroup, getSearchables } from './searchables';

const content: SearchContent = {
  user: [{ id: 'u1', slug: 'first-user', name: 'First user' }],
  tag: [{ id: 't1', slug: 'first-tag', name: 'First tag' }],
  post: [
    { id: 'p1', title: 'First post', status: 'published' },
    { id: 'p2', title: 'Second post', status: 'draft' },
    { id: 'p3', title: 'Third post', status: 'scheduled' },
  ],
  page: [{ id: 'g1', title: 'First page', status: 'draft' }],
};

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

const withBilling = getSearchables({ billing: { search: billingSearch } });

const postsTitled = (titles: string[]): SearchIndexItem[] =>
  titles.map((title, index) => ({ id: `p${index}`, title, status: 'published' }));

const groupNames = (groups: SearchResultGroup[]) => groups.map((group) => group.groupName);
const titles = (groups: SearchResultGroup[], groupName: string) =>
  groups.find((group) => group.groupName === groupName)?.options.map((option) => option.title);

describe.each([
  ['flex', createFlexSearchProvider],
  ['basic', createBasicSearchProvider],
])('%s search provider', (_name, create) => {
  const search = (term: string) => create(getSearchables(), content).search(term);

  it('groups matches in display order', () => {
    const results = search('first');

    expect(groupNames(results)).toEqual(['Staff', 'Tags', 'Posts', 'Pages']);
    expect(results.map((group) => group.options[0].id)).toEqual([
      'user.first-user',
      'tag.first-tag',
      'post.p1',
      'page.g1',
    ]);
  });

  it('orders posts scheduled, then draft, then published', () => {
    expect(titles(search('post'), 'Posts')).toEqual(['Third post', 'Second post', 'First post']);
  });

  it('ignores case', () => {
    expect(groupNames(search('FIRST'))).toEqual(['Staff', 'Tags', 'Posts', 'Pages']);
  });

  it.each(['', ' '])('returns nothing for the blank term %j', (term) => {
    expect(search(term)).toEqual([]);
  });

  it('returns nothing when nothing matches', () => {
    expect(search('nothing matches this')).toEqual([]);
  });

  it('caps each group at 100 results', () => {
    const posts = postsTitled(Array.from({ length: 150 }, (_, index) => `Post ${index}`));
    const [group] = create(getSearchables(), { post: posts }).search('post');

    expect(group.options).toHaveLength(100);
  });

  describe('billing results', () => {
    const searchBilling = (term: string) => create(withBilling, content).search(term);

    it('lists billing results before content results', () => {
      const groups = create(withBilling, {
        post: postsTitled(['Backup post']),
      }).search('backup');

      expect(groupNames(groups)).toEqual(['Acme Hosting', 'Posts']);
      expect(groups[0].groupKey).toBe('billing');
      expect(groups[0].options[0]).toMatchObject({
        id: 'pro-page.request-backup',
        title: 'Request backup',
        path: '/backups',
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
  const search = (term: string, posts: SearchIndexItem[] = content.post ?? []) =>
    titles(createFlexSearchProvider(getSearchables(), { post: posts }).search(term), 'Posts');

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

  it('does not fold diacritics or collapse repeated letters', () => {
    const posts = postsTitled(['Café', 'Coffee', 'Apple']);

    expect(search('cafe', posts)).toBeUndefined();
    expect(search('cofee', posts)).toBeUndefined();
    expect(search('aa', posts)).toBeUndefined();
  });
});

describe('basic search provider matching', () => {
  const search = (term: string) =>
    titles(createBasicSearchProvider(getSearchables(), content).search(term), 'Posts');

  it('matches anywhere inside the title', () => {
    expect(search('econd')).toEqual(['Second post']);
  });

  it('matches the term as one contiguous string', () => {
    expect(search('post second')).toBeUndefined();
    expect(search('second post')).toEqual(['Second post']);
  });

  it('sorts by status before capping', () => {
    const posts = [
      ...postsTitled(Array.from({ length: 150 }, (_, index) => `Post ${index}`)),
      { id: 'd1', title: 'Draft post', status: 'draft' },
    ];
    const [group] = createBasicSearchProvider(getSearchables(), { post: posts }).search('post');

    expect(group.options).toHaveLength(100);
    expect(group.options[0].title).toBe('Draft post');
  });
});

describe('createSearchProvider', () => {
  // only the basic provider matches inside a word
  const matchesInsideWords = (locale: string | null | undefined) =>
    createSearchProvider(getSearchables(), locale, { post: postsTitled(['Second post']) }).search(
      'econd',
    ).length > 0;

  it.each(['en', 'en-GB', 'EN', null, undefined])('uses FlexSearch for the %s locale', (locale) => {
    expect(matchesInsideWords(locale)).toBe(false);
  });

  it.each(['de', 'fr-CA', 'ja', ''])('uses substring matching for the %j locale', (locale) => {
    expect(matchesInsideWords(locale)).toBe(true);
  });
});
