import { describe, expect, it } from 'vitest';
import {
  type Searchable,
  createSubstringSearch,
  createTextSearch,
  createWordSearch,
} from './text-search';

const LIMIT = { limitPerField: 100 };

const itemsTitled = (titles: string[]): Searchable[] =>
  titles.map((title, index) => ({ id: `i${index}`, title }));

const items = itemsTitled(['First post', 'Second post', 'Third post']);

const titles = (results: Searchable[]) => results.map((item) => item.title);

describe.each([
  ['word', createWordSearch],
  ['substring', createSubstringSearch],
])('%s search', (_name, create) => {
  const search = (term: string) => titles(create(items).search(term, LIMIT));

  it('ignores case', () => {
    expect(search('SECOND')).toEqual(['Second post']);
  });

  it.each(['', ' '])('returns nothing for the blank term %j', (term) => {
    expect(search(term)).toEqual([]);
  });

  it('returns nothing when nothing matches', () => {
    expect(search('nothing matches this')).toEqual([]);
  });

  it('returns the items themselves', () => {
    const [result] = create(items).search('second', LIMIT);

    expect(result).toBe(items[1]);
  });

  it('keeps extra item fields', () => {
    const item = { id: 'a', title: 'Alpha', url: '/alpha/' };

    expect(create([item]).search('alpha', LIMIT)).toEqual([item]);
  });

  it('keeps at most limitPerField matches from each field', () => {
    const searched = itemsTitled(Array.from({ length: 150 }, (_, index) => `Post ${index}`));

    expect(create(searched).search('post', { limitPerField: 20 })).toHaveLength(20);
  });

  it('can return more than limitPerField when title and keywords both match', () => {
    const searched = [
      ...Array.from({ length: 20 }, (_, index) => ({
        id: `t${index}`,
        title: `shared title ${index}`,
      })),
      ...Array.from({ length: 20 }, (_, index) => ({
        id: `k${index}`,
        title: `Other ${index}`,
        keywords: 'shared',
      })),
    ];

    expect(create(searched).search('shared', { limitPerField: 10 })).toHaveLength(20);
  });
});

describe('word search', () => {
  const search = (term: string, searched: Searchable[] = items) =>
    titles(createWordSearch(searched).search(term, LIMIT));

  it('matches the start of any word', () => {
    expect(search('sec')).toEqual(['Second post']);
    expect(search('pos')).toEqual(['First post', 'Second post', 'Third post']);
  });

  it('does not match inside a word', () => {
    expect(search('econd')).toEqual([]);
  });

  it('matches every word of a multi-word term in any order', () => {
    expect(search('post second')).toEqual(['Second post']);
  });

  it('keeps numbers whole', () => {
    const searched = itemsTitled(['Top100 tips', 'Best of 2024']);

    expect(search('top1', searched)).toEqual(['Top100 tips']);
    expect(search('4', searched)).toEqual([]);
  });

  it('matches keywords after titles', () => {
    const searched = [
      { id: 'a', title: 'Alpha', keywords: 'beta' },
      { id: 'b', title: 'Beta' },
    ];

    expect(search('beta', searched)).toEqual(['Beta', 'Alpha']);
  });

  it('does not fold diacritics or collapse repeated letters', () => {
    const searched = itemsTitled(['Café', 'Coffee', 'Apple']);

    expect(search('cafe', searched)).toEqual([]);
    expect(search('cofee', searched)).toEqual([]);
    expect(search('aa', searched)).toEqual([]);
  });

  it('returns every match when limitPerField is omitted', () => {
    const searched = itemsTitled(Array.from({ length: 150 }, (_, index) => `Post ${index}`));

    expect(createWordSearch(searched).search('post')).toHaveLength(150);
  });
});

describe('substring search', () => {
  const search = (term: string, searched: Searchable[] = items) =>
    titles(createSubstringSearch(searched).search(term, LIMIT));

  it('matches anywhere inside the title', () => {
    expect(search('econd')).toEqual(['Second post']);
  });

  it('matches the term as one contiguous string', () => {
    expect(search('post second')).toEqual([]);
    expect(search('second post')).toEqual(['Second post']);
  });

  it('matches anywhere inside the keywords', () => {
    expect(search('cnam', [{ id: 'a', title: 'Custom domain', keywords: 'dns cname' }])).toEqual([
      'Custom domain',
    ]);
  });

  it('merges title and keyword field caps, title first', () => {
    const searched = [
      { id: 't1', title: 'shared one' },
      { id: 't2', title: 'shared two' },
      { id: 'k1', title: 'Other', keywords: 'shared' },
      { id: 'k2', title: 'Else', keywords: 'shared' },
    ];

    expect(titles(createSubstringSearch(searched).search('shared', { limitPerField: 1 }))).toEqual([
      'shared one',
      'Other',
    ]);
  });

  it('returns every match when limitPerField is omitted', () => {
    const searched = itemsTitled(Array.from({ length: 150 }, (_, index) => `Post ${index}`));

    expect(createSubstringSearch(searched).search('post')).toHaveLength(150);
  });
});

describe('createTextSearch', () => {
  // only substring search matches inside a word
  const matchesInsideWords = (locale: string | null | undefined) =>
    createTextSearch(itemsTitled(['Second post']), locale).search('econd', LIMIT).length > 0;

  it.each(['en', 'en-GB', 'EN', null, undefined])(
    'uses word search for the %s locale',
    (locale) => {
      expect(matchesInsideWords(locale)).toBe(false);
    },
  );

  it.each(['de', 'fr-CA', 'ja', ''])('uses substring search for the %j locale', (locale) => {
    expect(matchesInsideWords(locale)).toBe(true);
  });
});
