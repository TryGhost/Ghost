import { describe, expect, it } from 'vitest';
import type { User } from '@tryghost/admin-x-framework/api/users';
import { authorSuggestions, matchesAuthor, selectedAuthors } from './authors-options';

function user(overrides: Partial<User>): User {
  return {
    id: 'user-1',
    name: 'Jane Doe',
    slug: 'jane-doe',
    email: 'jane@example.com',
    ...overrides,
  } as User;
}

const JANE = user({ id: '1', name: 'Jane Doe', slug: 'jane-doe', email: 'jane@example.com' });
const JOSE = user({ id: '2', name: 'José García', slug: 'jose-garcia', email: 'jose@example.com' });
const NAMELESS = user({ id: '3', name: '', slug: 'ghost-writer', email: 'ghost@example.com' });

describe('matchesAuthor', () => {
  it.each([
    ['a name', 'jane'],
    ['a slug', 'jane-d'],
    ['an email', 'example.com'],
    ['any case', 'JANE DOE'],
  ])('matches on %s', (_label, term) => {
    expect(matchesAuthor(JANE, term)).toBe(true);
  });

  it('matches an accented name from an unaccented term', () => {
    expect(matchesAuthor(JOSE, 'jose garcia')).toBe(true);
    expect(matchesAuthor(JOSE, 'José')).toBe(true);
  });

  it('rejects a term no field carries', () => {
    expect(matchesAuthor(JANE, 'zzz')).toBe(false);
  });
});

describe('authorSuggestions', () => {
  it('offers everyone who is not already an author', () => {
    const suggestions = authorSuggestions(
      [JANE, JOSE],
      [{ id: '1', name: 'Jane Doe', email: '' }],
      '',
    );

    expect(suggestions.map(({ id }) => id)).toEqual(['2']);
  });

  it('narrows the offer by the typed term', () => {
    expect(authorSuggestions([JANE, JOSE], [], 'jane').map(({ id }) => id)).toEqual(['1']);
  });

  it('falls back to the email when a staff member has no name', () => {
    expect(authorSuggestions([NAMELESS], [], '')).toEqual([
      { id: '3', name: 'ghost@example.com', email: 'ghost@example.com' },
    ]);
  });

  it('answers with nothing before the staff browse has loaded', () => {
    expect(authorSuggestions(undefined, [], '')).toEqual([]);
  });
});

describe('selectedAuthors', () => {
  it('keeps the post’s own order rather than the browse order', () => {
    const selected = selectedAuthors([{ id: '2' }, { id: '1' }], [JANE, JOSE]);

    expect(selected.map(({ id }) => id)).toEqual(['2', '1']);
  });

  it('names an author from the relation while the browse is still loading', () => {
    expect(selectedAuthors([{ id: '1', name: 'Jane Doe' }], undefined)).toEqual([
      { id: '1', name: 'Jane Doe', email: '' },
    ]);
  });

  it('keeps an author the browse never returned', () => {
    expect(selectedAuthors([{ id: '9' }], [JANE])).toEqual([{ id: '9', name: '9', email: '' }]);
  });
});
