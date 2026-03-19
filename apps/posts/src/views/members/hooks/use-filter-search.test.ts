import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useFilterSearch} from './use-filter-search';

interface MockItem {
    id: string;
    name: string;
}

interface MockResponse {
    items: MockItem[];
}

function createMockQuery(items: MockItem[] = []) {
    return vi.fn().mockReturnValue({
        data: {items} as MockResponse,
        isLoading: false,
        isFetching: false,
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
        const items = [{id: 'a', name: 'Alpha'}, {id: 'b', name: 'Beta'}];
        const useQuery = createMockQuery(items);

        const {result} = renderHook(() => useFilterSearch<MockResponse, 'items'>({
            useQuery,
            dataKey: 'items',
            valueKey: 'id',
            labelKey: 'name'
        }));

        expect(result.current.options).toEqual([
            {value: 'a', label: 'Alpha'},
            {value: 'b', label: 'Beta'}
        ]);
        expect(result.current.searchValue).toBe('');
        expect(result.current.isLoading).toBe(false);
    });

    it('debounces search input', () => {
        const useQuery = createMockQuery();
        const buildSearchFilter = vi.fn((term: string) => `name:~'${term}'`);

        const {result} = renderHook(() => useFilterSearch<MockResponse, 'items'>({
            useQuery,
            dataKey: 'items',
            valueKey: 'id',
            labelKey: 'name',
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

        const {result} = renderHook(() => useFilterSearch<MockResponse, 'items'>({
            useQuery,
            dataKey: 'items',
            valueKey: 'id',
            labelKey: 'name',
            buildSearchFilter
        }));

        act(() => {
            result.current.onSearchChange('test');
            vi.advanceTimersByTime(300);
        });

        act(() => {
            result.current.onSearchChange('');
            vi.advanceTimersByTime(300);
        });

        const lastCall = useQuery.mock.calls[useQuery.mock.calls.length - 1];
        expect(lastCall[0].searchParams.filter).toBeUndefined();
    });

    it('does not call fetchNextPage when already fetching', () => {
        const fetchNextPage = vi.fn();
        const useQuery = vi.fn().mockReturnValue({
            data: {items: []} as MockResponse,
            isLoading: false,
            isFetching: false,
            fetchNextPage,
            hasNextPage: true,
            isFetchingNextPage: true
        });

        const {result} = renderHook(() => useFilterSearch<MockResponse, 'items'>({
            useQuery,
            dataKey: 'items',
            valueKey: 'id',
            labelKey: 'name'
        }));

        expect(result.current.hasMore).toBe(true);
        expect(result.current.isLoadingMore).toBe(true);

        act(() => {
            result.current.onLoadMore();
        });

        expect(fetchNextPage).not.toHaveBeenCalled();
    });

    it('calls fetchNextPage when hasNextPage is true and not already fetching', () => {
        const fetchNextPage = vi.fn();
        const useQuery = vi.fn().mockReturnValue({
            data: {items: []} as MockResponse,
            isLoading: false,
            isFetching: false,
            fetchNextPage,
            hasNextPage: true,
            isFetchingNextPage: false
        });

        const {result} = renderHook(() => useFilterSearch<MockResponse, 'items'>({
            useQuery,
            dataKey: 'items',
            valueKey: 'id',
            labelKey: 'name'
        }));

        act(() => {
            result.current.onLoadMore();
        });

        expect(fetchNextPage).toHaveBeenCalledOnce();
    });

    it('escapes single quotes in search terms', () => {
        const useQuery = createMockQuery();
        const buildSearchFilter = vi.fn((term: string) => `name:~'${term}'`);

        const {result} = renderHook(() => useFilterSearch<MockResponse, 'items'>({
            useQuery,
            dataKey: 'items',
            valueKey: 'id',
            labelKey: 'name',
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
            data: undefined as MockResponse | undefined,
            isLoading: true,
            isFetching: true,
            fetchNextPage: vi.fn(),
            hasNextPage: false,
            isFetchingNextPage: false
        });

        const {result} = renderHook(() => useFilterSearch<MockResponse, 'items'>({
            useQuery,
            dataKey: 'items',
            valueKey: 'id',
            labelKey: 'name'
        }));

        expect(result.current.isLoading).toBe(true);
    });

    it('reports isLoading while debouncing a search term', () => {
        const useQuery = createMockQuery([{id: 'a', name: 'Alpha'}]);

        const {result} = renderHook(() => useFilterSearch<MockResponse, 'items'>({
            useQuery,
            dataKey: 'items',
            valueKey: 'id',
            labelKey: 'name',
            buildSearchFilter: (term: string) => `name:~'${term}'`
        }));

        expect(result.current.isLoading).toBe(false);

        act(() => {
            result.current.onSearchChange('alp');
        });

        // Should be loading while debouncing
        expect(result.current.isLoading).toBe(true);

        act(() => {
            vi.advanceTimersByTime(300);
        });

        // After debounce, not fetching so not loading
        expect(result.current.isLoading).toBe(false);
    });

    it('reports isLoading while query is fetching search results', () => {
        const useQuery = vi.fn().mockReturnValue({
            data: {items: [{id: 'a', name: 'Alpha'}]} as MockResponse,
            isLoading: false,
            isFetching: true,
            fetchNextPage: vi.fn(),
            hasNextPage: false,
            isFetchingNextPage: false
        });

        const {result} = renderHook(() => useFilterSearch<MockResponse, 'items'>({
            useQuery,
            dataKey: 'items',
            valueKey: 'id',
            labelKey: 'name',
            buildSearchFilter: (term: string) => `name:~'${term}'`
        }));

        // Trigger a search and advance past debounce
        act(() => {
            result.current.onSearchChange('alp');
            vi.advanceTimersByTime(300);
        });

        // Should be loading because isFetching is true and there's a search term
        expect(result.current.isLoading).toBe(true);
    });

    it('does not report isLoading when isFetching on initial load with no search', () => {
        const useQuery = vi.fn().mockReturnValue({
            data: {items: [{id: 'a', name: 'Alpha'}]} as MockResponse,
            isLoading: false,
            isFetching: true,
            fetchNextPage: vi.fn(),
            hasNextPage: false,
            isFetchingNextPage: false
        });

        const {result} = renderHook(() => useFilterSearch<MockResponse, 'items'>({
            useQuery,
            dataKey: 'items',
            valueKey: 'id',
            labelKey: 'name'
        }));

        // isFetching but no search term — should not show loading
        expect(result.current.isLoading).toBe(false);
    });

    it('tracks initialCount from first unfiltered results', () => {
        const items = [{id: 'a', name: 'Alpha'}, {id: 'b', name: 'Beta'}, {id: 'c', name: 'Charlie'}];
        const useQuery = createMockQuery(items);

        const {result} = renderHook(() => useFilterSearch<MockResponse, 'items'>({
            useQuery,
            dataKey: 'items',
            valueKey: 'id',
            labelKey: 'name'
        }));

        expect(result.current.initialCount).toBe(3);
    });

    it('combines baseFilter with search filter', () => {
        const useQuery = createMockQuery();
        const buildSearchFilter = vi.fn((term: string) => `name:~'${term}'`);

        const {result} = renderHook(() => useFilterSearch<MockResponse, 'items'>({
            useQuery,
            dataKey: 'items',
            valueKey: 'id',
            labelKey: 'name',
            baseFilter: 'type:paid',
            buildSearchFilter
        }));

        // Base filter should always be present
        const initialCall = useQuery.mock.calls[useQuery.mock.calls.length - 1];
        expect(initialCall[0].searchParams.filter).toBe('type:paid');

        // Search adds to the base filter
        act(() => {
            result.current.onSearchChange('gold');
            vi.advanceTimersByTime(300);
        });

        const searchCall = useQuery.mock.calls[useQuery.mock.calls.length - 1];
        expect(searchCall[0].searchParams.filter).toBe('type:paid+name:~\'gold\'');
    });
});
