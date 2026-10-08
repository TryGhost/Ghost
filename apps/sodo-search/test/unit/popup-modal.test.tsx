import AppContext from '../../src/app-context';
import { Search } from '../../src/components/popup-modal';
import { createRef } from 'preact';
import { fireEvent, render, screen } from '@testing-library/preact';
import type { AppContextType } from '../../src/app-context';
import type SearchIndex from '../../src/search-index';

const posts = [
  {
    id: 'post-1',
    title: 'First post',
    excerpt: 'First post excerpt',
    url: 'https://example.com/first-post/',
  },
  {
    id: 'post-2',
    title: 'Second post',
    excerpt: 'Second post excerpt',
    url: 'https://example.com/second-post/',
  },
];

const renderSearch = (results = posts, searchValue = 'post') => {
  const context: AppContextType = {
    searchIndex: {
      search: () => ({ posts: results, authors: [], tags: [] }),
    } as unknown as SearchIndex,
    indexComplete: true,
    searchValue,
    setSearchValue: () => {},
    closePopup: () => {},
    inputRef: createRef(),
    t: (str) => str,
    dir: 'ltr',
  };
  render(
    <AppContext.Provider value={context}>
      <Search />
    </AppContext.Provider>,
  );
  return screen.getByRole('combobox');
};

describe('Search keyboard navigation', () => {
  beforeEach(() => {
    vi.stubGlobal('location', { href: 'https://example.com/' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('navigates to the selected result on Enter', () => {
    const input = renderSearch();

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(window.location.href).toBe('https://example.com/first-post/');
  });

  test('does not navigate on Enter during IME composition', () => {
    const input = renderSearch();

    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

    expect(window.location.href).toBe('https://example.com/');
  });

  test('does not navigate on Enter with keyCode 229 (legacy IME)', () => {
    const input = renderSearch();

    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });

    expect(window.location.href).toBe('https://example.com/');
  });
});

describe('Search accessibility', () => {
  test('is a modal dialog named after the search', () => {
    renderSearch();

    const dialog = screen.getByRole('dialog', { name: 'Search posts, tags and authors' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  test('exposes the input as a combobox over a listbox of result links', () => {
    const input = renderSearch();

    expect(input).toHaveAccessibleName('Search posts, tags and authors');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox', { name: 'Search results' });
    expect(input).toHaveAttribute('aria-controls', listbox.id);

    const options = screen.getAllByRole('option');
    expect(screen.getByRole('group', { name: 'Posts' })).toContainElement(options[0]);
    expect(options.map((option) => option.getAttribute('href'))).toEqual([
      'https://example.com/first-post/',
      'https://example.com/second-post/',
    ]);
    expect(options[0]).toHaveAttribute('target', '_top');
    expect(options[0]).toHaveAttribute('tabindex', '-1');
  });

  test('tracks the selected result with aria-activedescendant', () => {
    const input = renderSearch();
    const options = screen.getAllByRole('option');

    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, { key: 'ArrowDown' });

    expect(input).toHaveAttribute('aria-activedescendant', options[1].id);
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
  });

  test('keeps keyboard selection within the results that are shown', () => {
    const manyPosts = Array.from({ length: 15 }, (_, i) => ({
      id: `post-${i + 1}`,
      title: `Post ${i + 1}`,
      excerpt: '',
      url: `https://example.com/post-${i + 1}/`,
    }));
    const input = renderSearch(manyPosts);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(11);

    for (let i = 0; i < 15; i++) {
      fireEvent.keyDown(input, { key: 'ArrowDown' });
    }

    expect(input).toHaveAttribute('aria-activedescendant', options[10].id);
    expect(options[10]).toHaveAttribute('aria-selected', 'true');
  });

  test('announces when nothing matches', () => {
    renderSearch([], 'zzz');

    expect(screen.getByRole('status')).toHaveTextContent('No matches found');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  });

  test('names the icon-only clear button', () => {
    renderSearch();

    expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();
  });
});

describe('Search highlighting', () => {
  test.each([
    ['café', 'Café culture', 'Café'],
    ['привет', 'Привет мир', 'Привет'],
    ['c++', 'C++ tips', 'C++'],
    ['new', 'New post', 'New'],
    ['世界', '你好世界', '世界'],
  ])('highlights %s in "%s"', (query, title, highlighted) => {
    renderSearch([{ id: 'post', title, excerpt: '', url: 'https://example.com/post/' }], query);

    expect(screen.getByRole('option').querySelector('span.font-bold')).toHaveTextContent(
      highlighted,
    );
  });
});
