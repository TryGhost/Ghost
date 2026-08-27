import { MemoryRouter, useSearchParams } from 'react-router';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePostsFilterState } from './use-posts-filter-state';
import type { ReactNode } from 'react';

function createWrapper(initialEntry: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

function renderState(initialEntry: string) {
  return renderHook(
    () => {
      const state = usePostsFilterState();
      const [searchParams] = useSearchParams();

      return { ...state, query: searchParams.toString() };
    },
    { wrapper: createWrapper(initialEntry) },
  );
}

describe('usePostsFilterState', () => {
  it('starts empty with no params', () => {
    const { result } = renderState('/posts');

    expect(result.current.filters).toEqual([]);
    // `params` carries order too - the query layer needs it to resolve each
    // bucket's sort - even though it is not part of the chip model.
    expect(result.current.params).toEqual({
      type: null,
      visibility: null,
      author: null,
      tag: null,
      order: null,
    });
    expect(result.current.order).toBeNull();
    expect(result.current.hasFilters).toBe(false);
  });

  it('hydrates filters from the URL', () => {
    const { result } = renderState('/posts?type=draft&tag=news');

    expect(result.current.filters.map((filter) => filter.field)).toEqual(['type', 'tag']);
    expect(result.current.params).toMatchObject({ type: 'draft', tag: 'news' });
    expect(result.current.hasFilters).toBe(true);
  });

  it('reads order separately from the filters', () => {
    const { result } = renderState('/posts?order=updated_at%20desc');

    expect(result.current.order).toBe('updated_at desc');
    expect(result.current.filters).toEqual([]);
    // Sorting is not filtering - it must not trigger the "no posts match
    // the current filter" empty state.
    expect(result.current.hasFilters).toBe(false);
  });

  it('does not treat a whitespace-only URL value as a filter', () => {
    const { result } = renderState('/posts?tag=%20%20');

    expect(result.current.filters).toEqual([]);
    expect(result.current.hasFilters).toBe(false);
  });

  // A URL is a saved view's identity. Rewriting it on load - even
  // canonicalising it - would silently corrupt the user's view, and the
  // Ember screen would then read something different.
  it('never rewrites the URL on hydration', async () => {
    const { result } = renderState('/posts?type=draft&tag=news&order=updated_at+desc');
    const initial = result.current.query;

    await waitFor(() => {
      expect(result.current.filters).toHaveLength(2);
    });

    expect(result.current.query).toBe(initial);
  });

  it('keeps params it does not recognise', async () => {
    const { result } = renderState('/posts?type=nonsense&tag=deleted-tag');

    await waitFor(() => {
      expect(result.current.filters).toHaveLength(2);
    });

    expect(result.current.query).toContain('type=nonsense');
    expect(result.current.query).toContain('tag=deleted-tag');
  });

  it('writes filter changes back to the URL', async () => {
    const { result } = renderState('/posts');

    act(() => {
      result.current.setFilters([
        { id: 'type:1', field: 'type', operator: 'is', values: ['draft'] },
      ]);
    });

    await waitFor(() => {
      expect(result.current.query).toBe('type=draft');
    });
    expect(result.current.params).toMatchObject({ type: 'draft' });
  });

  it('removes a param entirely rather than leaving it empty', async () => {
    const { result } = renderState('/posts?type=draft');

    act(() => {
      result.current.setFilters([]);
    });

    await waitFor(() => {
      expect(result.current.query).toBe('');
    });
  });

  it('changes the sort without touching the filters', async () => {
    const { result } = renderState('/posts?type=draft');

    act(() => {
      result.current.setOrder('published_at asc');
    });

    await waitFor(() => {
      expect(result.current.order).toBe('published_at asc');
    });
    expect(result.current.query).toContain('type=draft');
    expect(result.current.params).toMatchObject({ type: 'draft' });
  });

  it('drops the order param when returning to the default sort', async () => {
    const { result } = renderState('/posts?order=published_at+asc');

    act(() => {
      result.current.setOrder(null);
    });

    await waitFor(() => {
      expect(result.current.query).toBe('');
    });
  });

  // "Show all posts" in the filtered empty state. Ember's link resets
  // type/author/tag/visibility but deliberately NOT order, so a chosen sort
  // survives clearing the filters.
  it('clears the filters but keeps the sort', async () => {
    const { result } = renderState('/posts?type=draft&tag=news&order=published_at+asc');

    act(() => {
      result.current.clearFilters();
    });

    await waitFor(() => {
      expect(result.current.filters).toEqual([]);
    });
    expect(result.current.query).toBe('order=published_at+asc');
    expect(result.current.order).toBe('published_at asc');
  });

  it('leaves unrelated query params alone', async () => {
    const { result } = renderState('/posts?type=draft&somethingElse=keepme');

    act(() => {
      result.current.setFilters([]);
    });

    await waitFor(() => {
      expect(result.current.query).toBe('somethingElse=keepme');
    });
  });

  // Back/forward must re-hydrate rather than replay the last write.
  it('follows external URL changes', async () => {
    const { result, rerender } = renderHook(
      () => {
        const state = usePostsFilterState();
        const [searchParams, setSearchParams] = useSearchParams();

        return { ...state, query: searchParams.toString(), setSearchParams };
      },
      { wrapper: createWrapper('/posts?type=draft') },
    );

    act(() => {
      result.current.setSearchParams(new URLSearchParams('type=scheduled'));
    });
    rerender();

    await waitFor(() => {
      expect(result.current.params).toMatchObject({ type: 'scheduled' });
    });
  });
});
