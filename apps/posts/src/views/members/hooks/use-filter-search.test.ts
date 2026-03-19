import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useFilterSearch, useFilterSearchParams} from './use-filter-search';

describe('useFilterSearchParams', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns empty searchParams when no search term', () => {
        const buildFilter = (term: string) => `name:~'${term}'`;

        const {result} = renderHook(() => useFilterSearchParams(buildFilter));

        expect(result.current.searchValue).toBe('');
        expect(result.current.searchParams).toEqual({});
    });

    it('debounces search input', () => {
        const buildFilter = vi.fn((term: string) => `name:~'${term}'`);

        const {result} = renderHook(() => useFilterSearchParams(buildFilter));

        act(() => {
            result.current.onSearchChange('hel');
        });

        // Search value updates immediately
        expect(result.current.searchValue).toBe('hel');

        // But searchParams should not have filter yet (still debouncing)
        expect(result.current.searchParams).toEqual({});

        // Fast-forward past debounce
        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(result.current.searchParams).toEqual({filter: 'name:~\'hel\''});
    });

    it('clears filter param when search term is cleared', () => {
        const buildFilter = (term: string) => `name:~'${term}'`;

        const {result} = renderHook(() => useFilterSearchParams(buildFilter));

        act(() => {
            result.current.onSearchChange('test');
            vi.advanceTimersByTime(300);
        });

        expect(result.current.searchParams.filter).toBeDefined();

        act(() => {
            result.current.onSearchChange('');
            vi.advanceTimersByTime(300);
        });

        expect(result.current.searchParams).toEqual({});
    });

    it('escapes single quotes in search terms', () => {
        const buildFilter = vi.fn((term: string) => `name:~'${term}'`);

        const {result} = renderHook(() => useFilterSearchParams(buildFilter));

        act(() => {
            result.current.onSearchChange('it\'s');
            vi.advanceTimersByTime(300);
        });

        expect(buildFilter).toHaveBeenCalledWith('it\'\'s');
    });
});

describe('useFilterSearch', () => {
    it('returns options from query result', () => {
        const items = [{value: 'a', label: 'Alpha'}, {value: 'b', label: 'Beta'}];
        const queryResult = {
            data: {items},
            isLoading: false,
            fetchNextPage: vi.fn(),
            hasNextPage: false,
            isFetchingNextPage: false
        };

        const {result} = renderHook(() => useFilterSearch({
            queryResult,
            extractItems: (data: {items: typeof items}) => data.items
        }));

        expect(result.current.options).toEqual(items);
        expect(result.current.isLoading).toBe(false);
    });

    it('exposes hasMore/isLoadingMore from the query result', () => {
        const queryResult = {
            data: {items: []},
            isLoading: false,
            fetchNextPage: vi.fn(),
            hasNextPage: true,
            isFetchingNextPage: true
        };

        const {result} = renderHook(() => useFilterSearch({
            queryResult,
            extractItems: () => []
        }));

        expect(result.current.hasMore).toBe(true);
        expect(result.current.isLoadingMore).toBe(true);
    });

    it('does not call fetchNextPage when already fetching', () => {
        const fetchNextPage = vi.fn();
        const queryResult = {
            data: {items: []},
            isLoading: false,
            fetchNextPage,
            hasNextPage: true,
            isFetchingNextPage: true
        };

        const {result} = renderHook(() => useFilterSearch({
            queryResult,
            extractItems: () => []
        }));

        act(() => {
            result.current.onLoadMore();
        });

        expect(fetchNextPage).not.toHaveBeenCalled();
    });

    it('calls fetchNextPage when hasNextPage is true and not fetching', () => {
        const fetchNextPage = vi.fn();
        const queryResult = {
            data: {items: []},
            isLoading: false,
            fetchNextPage,
            hasNextPage: true,
            isFetchingNextPage: false
        };

        const {result} = renderHook(() => useFilterSearch({
            queryResult,
            extractItems: () => []
        }));

        act(() => {
            result.current.onLoadMore();
        });

        expect(fetchNextPage).toHaveBeenCalledOnce();
    });

    it('reports isLoading only when there are no options and query is loading', () => {
        const queryResult = {
            data: undefined,
            isLoading: true,
            fetchNextPage: vi.fn(),
            hasNextPage: undefined,
            isFetchingNextPage: false
        };

        const {result} = renderHook(() => useFilterSearch({
            queryResult,
            extractItems: () => []
        }));

        expect(result.current.isLoading).toBe(true);
    });

    it('defaults hasMore to false when hasNextPage is undefined', () => {
        const queryResult = {
            data: undefined,
            isLoading: true,
            fetchNextPage: vi.fn(),
            hasNextPage: undefined,
            isFetchingNextPage: false
        };

        const {result} = renderHook(() => useFilterSearch({
            queryResult,
            extractItems: () => []
        }));

        expect(result.current.hasMore).toBe(false);
    });
});
