import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useFilterSearch} from './use-filter-search';

function createMockQuery(items: Array<{value: string; label: string}> = []) {
    return vi.fn().mockReturnValue({
        data: {items},
        isLoading: false,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false
    });
}

describe('useFilterSearch', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns initial page of results when no search term', () => {
        const items = [{value: 'a', label: 'Alpha'}, {value: 'b', label: 'Beta'}];
        const useQuery = createMockQuery(items);

        const {result} = renderHook(() => useFilterSearch({
            useQuery,
            extractItems: (data: {items: typeof items}) => data.items
        }));

        expect(result.current.options).toEqual(items);
        expect(result.current.searchValue).toBe('');
        expect(result.current.isLoading).toBe(false);
    });

    it('debounces search input', () => {
        const useQuery = createMockQuery();
        const buildSearchFilter = vi.fn((term: string) => `name:~'${term}'`);

        const {result} = renderHook(() => useFilterSearch({
            useQuery,
            extractItems: (data: {items: never[]}) => data.items,
            buildSearchFilter
        }));

        act(() => {
            result.current.onSearchChange('hel');
        });

        // Search value updates immediately
        expect(result.current.searchValue).toBe('hel');

        // But the query should not have received the filter yet (still debouncing)
        const lastCallBeforeDebounce = useQuery.mock.calls[useQuery.mock.calls.length - 1];
        expect(lastCallBeforeDebounce[0].searchParams.filter).toBeUndefined();

        // Fast-forward past debounce
        act(() => {
            vi.advanceTimersByTime(300);
        });

        const lastCallAfterDebounce = useQuery.mock.calls[useQuery.mock.calls.length - 1];
        expect(lastCallAfterDebounce[0].searchParams.filter).toBe('name:~\'hel\'');
    });

    it('clears filter param when search term is cleared', () => {
        const useQuery = createMockQuery();
        const buildSearchFilter = vi.fn((term: string) => `name:~'${term}'`);

        const {result} = renderHook(() => useFilterSearch({
            useQuery,
            extractItems: (data: {items: never[]}) => data.items,
            buildSearchFilter
        }));

        // Type then debounce
        act(() => {
            result.current.onSearchChange('test');
            vi.advanceTimersByTime(300);
        });

        // Clear
        act(() => {
            result.current.onSearchChange('');
            vi.advanceTimersByTime(300);
        });

        const lastCall = useQuery.mock.calls[useQuery.mock.calls.length - 1];
        expect(lastCall[0].searchParams.filter).toBeUndefined();
    });

    it('exposes fetchNextPage/hasMore/isLoadingMore from the infinite query', () => {
        const fetchNextPage = vi.fn();
        const useQuery = vi.fn().mockReturnValue({
            data: {items: []},
            isLoading: false,
            fetchNextPage,
            hasNextPage: true,
            isFetchingNextPage: true
        });

        const {result} = renderHook(() => useFilterSearch({
            useQuery,
            extractItems: (data: {items: never[]}) => data.items
        }));

        expect(result.current.hasMore).toBe(true);
        expect(result.current.isLoadingMore).toBe(true);

        act(() => {
            result.current.onLoadMore();
        });

        // Should not call fetchNextPage because isFetchingNextPage is true
        expect(fetchNextPage).not.toHaveBeenCalled();
    });

    it('calls fetchNextPage when hasNextPage is true and not already fetching', () => {
        const fetchNextPage = vi.fn();
        const useQuery = vi.fn().mockReturnValue({
            data: {items: []},
            isLoading: false,
            fetchNextPage,
            hasNextPage: true,
            isFetchingNextPage: false
        });

        const {result} = renderHook(() => useFilterSearch({
            useQuery,
            extractItems: (data: {items: never[]}) => data.items
        }));

        act(() => {
            result.current.onLoadMore();
        });

        expect(fetchNextPage).toHaveBeenCalledOnce();
    });

    it('escapes single quotes in search terms', () => {
        const useQuery = createMockQuery();
        const buildSearchFilter = vi.fn((term: string) => `name:~'${term}'`);

        const {result} = renderHook(() => useFilterSearch({
            useQuery,
            extractItems: (data: {items: never[]}) => data.items,
            buildSearchFilter
        }));

        act(() => {
            result.current.onSearchChange('it\'s');
            vi.advanceTimersByTime(300);
        });

        expect(buildSearchFilter).toHaveBeenCalledWith('it\'\'s');
    });

    it('reports isLoading only when there are no options and query is loading', () => {
        const useQuery = vi.fn().mockReturnValue({
            data: undefined,
            isLoading: true,
            fetchNextPage: vi.fn(),
            hasNextPage: false,
            isFetchingNextPage: false
        });

        const {result} = renderHook(() => useFilterSearch({
            useQuery,
            extractItems: () => []
        }));

        expect(result.current.isLoading).toBe(true);
    });
});
