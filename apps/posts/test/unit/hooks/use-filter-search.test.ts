import {type UseFilterSearchOptions, useFilterSearch} from '@src/hooks/use-filter-search';
import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

// --- Test types ---

interface TestItem {
    id: string;
    name: string;
}

interface TestResponse {
    items: TestItem[];
    isEnd: boolean;
}

// --- Helpers ---

function createMockQuery(initialData: TestResponse | undefined = undefined) {
    const state = {
        data: initialData,
        isLoading: !initialData,
        isFetching: !initialData,
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
        lastSearchParams: undefined as Record<string, string> | undefined
    };

    const useQuery = (options?: {searchParams?: Record<string, string>}) => {
        state.lastSearchParams = options?.searchParams;
        return {
            data: state.data,
            isLoading: state.isLoading,
            isFetching: state.isFetching,
            hasNextPage: state.hasNextPage,
            isFetchingNextPage: state.isFetchingNextPage,
            fetchNextPage: state.fetchNextPage
        };
    };

    return {useQuery, state};
}

const defaultLocalFilter = (items: TestItem[], term: string) => items.filter(i => i.name.toLowerCase().includes(term.toLowerCase()));

const defaultToOption = (item: TestItem) => ({value: item.id, label: item.name});
const defaultUseGetById: UseFilterSearchOptions<TestResponse, 'items'>['useGetById'] = () => ({data: undefined, isError: false});

// --- Tests ---

describe('useFilterSearch', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('initial loading', () => {
        it('returns isLoading true when data is not yet available', () => {
            const {useQuery} = createMockQuery();

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: defaultLocalFilter,
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            expect(result.current.isLoading).toBe(true);
            expect(result.current.items).toEqual([]);
            expect(result.current.data).toBeUndefined();
        });

        it('returns data and items when loaded', () => {
            const data: TestResponse = {
                items: [{id: '1', name: 'Alpha'}, {id: '2', name: 'Beta'}],
                isEnd: true
            };
            const {useQuery} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: defaultLocalFilter,
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            expect(result.current.isLoading).toBe(false);
            expect(result.current.items).toEqual(data.items);
            expect(result.current.data).toEqual(data);
        });

        it('returns empty items when dataKey contains non-array', () => {
            const data = {items: 'not-an-array', isEnd: true} as unknown as TestResponse;
            const {useQuery} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: defaultLocalFilter,
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            expect(result.current.items).toEqual([]);
        });
    });

    describe('local search mode', () => {
        it('uses local search when items fit on one page (count < limit)', () => {
            const data: TestResponse = {
                items: [
                    {id: '1', name: 'Alpha'},
                    {id: '2', name: 'Beta'},
                    {id: '3', name: 'Gamma'}
                ],
                isEnd: true
            };
            const {useQuery, state} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: (term): Record<string, string> => (term ? {filter: `name:~'${term}'`} : {}),
                localSearchFilter: defaultLocalFilter,
                limit: '100',
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            // Type a search term
            act(() => {
                result.current.onSearchChange('alpha');
            });

            // Local search filters immediately (no debounce)
            expect(result.current.items).toEqual([{id: '1', name: 'Alpha'}]);
            expect(result.current.searchValue).toBe('alpha');

            // Server was NOT called with the search term
            expect(state.lastSearchParams).not.toHaveProperty('filter', expect.stringContaining('alpha'));
        });

        it('keeps allItems stable during local search filtering', () => {
            const data: TestResponse = {
                items: [
                    {id: '1', name: 'Alpha'},
                    {id: '2', name: 'Beta'},
                    {id: '3', name: 'Gamma'}
                ],
                isEnd: true
            };
            const {useQuery} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: defaultLocalFilter,
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            // allItems should contain all items before search
            expect(result.current.allItems).toHaveLength(3);

            // Search filters items but allItems stays stable
            act(() => {
                result.current.onSearchChange('alpha');
            });
            expect(result.current.items).toHaveLength(1);
            expect(result.current.allItems).toHaveLength(3);
        });

        it('returns all items when search is cleared in local mode', () => {
            const data: TestResponse = {
                items: [
                    {id: '1', name: 'Alpha'},
                    {id: '2', name: 'Beta'}
                ],
                isEnd: true
            };
            const {useQuery} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: defaultLocalFilter,
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            act(() => {
                result.current.onSearchChange('alpha');
            });
            expect(result.current.items).toHaveLength(1);

            act(() => {
                result.current.onSearchChange('');
            });
            expect(result.current.items).toHaveLength(2);
        });

        it('reports hasMore as false in local search mode', () => {
            const data: TestResponse = {
                items: [{id: '1', name: 'Alpha'}],
                isEnd: true
            };
            const {useQuery} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: defaultLocalFilter,
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            expect(result.current.hasMore).toBe(false);
        });

        it('does not debounce in local search mode', () => {
            const data: TestResponse = {
                items: [
                    {id: '1', name: 'Alpha'},
                    {id: '2', name: 'Beta'}
                ],
                isEnd: true
            };
            const {useQuery} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: defaultLocalFilter,
                debounceMs: 500,
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            act(() => {
                result.current.onSearchChange('alpha');
            });

            // Should filter immediately without waiting for debounce
            expect(result.current.items).toEqual([{id: '1', name: 'Alpha'}]);
        });
    });

    describe('server search mode', () => {
        it('uses server search when items fill the page (count >= limit)', () => {
            const items = Array.from({length: 25}, (_, i) => ({
                id: String(i),
                name: `Item ${i}`
            }));
            const data: TestResponse = {items, isEnd: false};
            const {useQuery, state} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: (term): Record<string, string> => (term ? {filter: `name:~'${term}'`} : {}),
                localSearchFilter: defaultLocalFilter,
                limit: '25',
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            act(() => {
                result.current.onSearchChange('test');
            });

            // Before debounce: server not called with search term yet
            expect(state.lastSearchParams?.filter).toBeUndefined();

            // After debounce
            act(() => {
                vi.advanceTimersByTime(250);
            });

            expect(state.lastSearchParams?.filter).toBe('name:~\'test\'');
        });

        it('debounces server search calls', () => {
            const items = Array.from({length: 25}, (_, i) => ({
                id: String(i),
                name: `Item ${i}`
            }));
            const data: TestResponse = {items, isEnd: false};
            const {useQuery, state} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: (term): Record<string, string> => (term ? {search: term} : {}),
                localSearchFilter: defaultLocalFilter,
                limit: '25',
                debounceMs: 300,
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            // Rapid typing
            act(() => {
                result.current.onSearchChange('a');
            });
            act(() => {
                vi.advanceTimersByTime(100);
            });
            act(() => {
                result.current.onSearchChange('ab');
            });
            act(() => {
                vi.advanceTimersByTime(100);
            });
            act(() => {
                result.current.onSearchChange('abc');
            });

            // Not yet debounced
            expect(state.lastSearchParams?.search).toBeUndefined();

            // After full debounce from last keystroke
            act(() => {
                vi.advanceTimersByTime(300);
            });

            expect(state.lastSearchParams?.search).toBe('abc');
        });

        it('passes non-filter search params to server', () => {
            const items = Array.from({length: 50}, (_, i) => ({
                id: String(i),
                name: `Item ${i}`
            }));
            const data: TestResponse = {items, isEnd: false};
            const {useQuery, state} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: (term): Record<string, string> => (term ? {search: term} : {}),
                localSearchFilter: defaultLocalFilter,
                limit: '50',
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            act(() => {
                result.current.onSearchChange('query');
            });
            act(() => {
                vi.advanceTimersByTime(250);
            });

            expect(state.lastSearchParams?.search).toBe('query');
        });

        it('combines base filter with search term', () => {
            const items = Array.from({length: 100}, (_, i) => ({
                id: String(i),
                name: `Item ${i}`
            }));
            const data: TestResponse = {items, isEnd: false};
            const {useQuery, state} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: term => ({
                    filter: term ? `type:paid+name:~'${term}'` : 'type:paid'
                }),
                localSearchFilter: defaultLocalFilter,
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            // Initial load: base filter only
            expect(state.lastSearchParams?.filter).toBe('type:paid');

            act(() => {
                result.current.onSearchChange('premium');
            });
            act(() => {
                vi.advanceTimersByTime(250);
            });

            expect(state.lastSearchParams?.filter).toBe('type:paid+name:~\'premium\'');
        });
    });

    describe('serverSearchParams', () => {
        it('receives empty string on initial load', () => {
            const serverSearchParams = vi.fn(() => ({}));
            const data: TestResponse = {items: [], isEnd: true};
            const {useQuery} = createMockQuery(data);

            renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams,
                localSearchFilter: defaultLocalFilter,
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            expect(serverSearchParams).toHaveBeenCalledWith('');
        });

        it('applies default limit when not specified in params', () => {
            const data: TestResponse = {items: [], isEnd: true};
            const {useQuery, state} = createMockQuery(data);

            renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: defaultLocalFilter,
                limit: '50',
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            expect(state.lastSearchParams?.limit).toBe('50');
        });

        it('does not override limit when specified in params', () => {
            const data: TestResponse = {items: [], isEnd: true};
            const {useQuery, state} = createMockQuery(data);

            renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({limit: '25'}),
                localSearchFilter: defaultLocalFilter,
                limit: '100',
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            expect(state.lastSearchParams?.limit).toBe('25');
        });
    });

    describe('infinite scroll', () => {
        it('calls fetchNextPage on onLoadMore when hasNextPage', () => {
            const items = Array.from({length: 25}, (_, i) => ({
                id: String(i),
                name: `Item ${i}`
            }));
            const data: TestResponse = {items, isEnd: false};
            const {useQuery, state} = createMockQuery(data);
            state.hasNextPage = true;

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: defaultLocalFilter,
                limit: '25',
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            act(() => {
                result.current.onLoadMore();
            });

            expect(state.fetchNextPage).toHaveBeenCalled();
        });

        it('does not call fetchNextPage when no next page', () => {
            const data: TestResponse = {items: [{id: '1', name: 'Alpha'}], isEnd: true};
            const {useQuery, state} = createMockQuery(data);
            state.hasNextPage = false;

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: defaultLocalFilter,
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            act(() => {
                result.current.onLoadMore();
            });

            expect(state.fetchNextPage).not.toHaveBeenCalled();
        });

        it('does not call fetchNextPage when already fetching next page', () => {
            const items = Array.from({length: 25}, (_, i) => ({
                id: String(i),
                name: `Item ${i}`
            }));
            const data: TestResponse = {items, isEnd: false};
            const {useQuery, state} = createMockQuery(data);
            state.hasNextPage = true;
            state.isFetchingNextPage = true;

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: defaultLocalFilter,
                limit: '25',
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            act(() => {
                result.current.onLoadMore();
            });

            expect(state.fetchNextPage).not.toHaveBeenCalled();
        });

        it('reports hasMore from hasNextPage in server mode', () => {
            const items = Array.from({length: 25}, (_, i) => ({
                id: String(i),
                name: `Item ${i}`
            }));
            const data: TestResponse = {items, isEnd: false};
            const {useQuery, state} = createMockQuery(data);
            state.hasNextPage = true;

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: defaultLocalFilter,
                limit: '25',
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            expect(result.current.hasMore).toBe(true);
        });

        it('reports isLoadingMore from isFetchingNextPage', () => {
            const items = Array.from({length: 25}, (_, i) => ({
                id: String(i),
                name: `Item ${i}`
            }));
            const data: TestResponse = {items, isEnd: false};
            const {useQuery, state} = createMockQuery(data);
            state.isFetchingNextPage = true;

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: defaultLocalFilter,
                limit: '25',
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            expect(result.current.isLoadingMore).toBe(true);
        });
    });

    describe('search value', () => {
        it('exposes current search value', () => {
            const data: TestResponse = {items: [], isEnd: true};
            const {useQuery} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: defaultLocalFilter,
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            expect(result.current.searchValue).toBe('');

            act(() => {
                result.current.onSearchChange('test');
            });

            expect(result.current.searchValue).toBe('test');
        });
    });

    describe('options filtering and ordering', () => {
        it('returns only matching options during search in local mode', () => {
            const data: TestResponse = {
                items: [
                    {id: '1', name: 'Alpha'},
                    {id: '2', name: 'Beta'},
                    {id: '3', name: 'Gamma'},
                    {id: '4', name: 'Delta'}
                ],
                isEnd: true
            };
            const {useQuery} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: defaultLocalFilter,
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            expect(result.current.options.map(o => o.label)).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);

            // Search should return only matching options (case-insensitive 'a' matches Alpha, Beta, Gamma, Delta)
            act(() => {
                result.current.onSearchChange('alph');
            });
            expect(result.current.options.map(o => o.label)).toEqual(['Alpha']);
        });

        it('restores canonical order after clearing search in local mode', () => {
            const data: TestResponse = {
                items: [
                    {id: '1', name: 'Alpha'},
                    {id: '2', name: 'Beta'},
                    {id: '3', name: 'Gamma'},
                    {id: '4', name: 'Delta'}
                ],
                isEnd: true
            };
            const {useQuery} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: defaultLocalFilter,
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            const originalOrder = result.current.options.map(o => o.label);

            act(() => {
                result.current.onSearchChange('gamma');
            });
            // During search, only matching items
            expect(result.current.options.map(o => o.label)).toEqual(['Gamma']);

            act(() => {
                result.current.onSearchChange('');
            });
            // After clearing, full list in original order
            expect(result.current.options.map(o => o.label)).toEqual(originalOrder);
        });

        it('shows base options during debounce window in server mode', () => {
            const items = Array.from({length: 25}, (_, i) => ({
                id: String(i),
                name: `Item ${String(i).padStart(2, '0')}`
            }));
            const data: TestResponse = {items, isEnd: false};
            const {useQuery} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: (term): Record<string, string> => (term ? {filter: `name:~'${term}'`} : {}),
                localSearchFilter: defaultLocalFilter,
                limit: '25',
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            const originalOptions = result.current.options;

            // During debounce window, options should stay as base (not locally filtered)
            act(() => {
                result.current.onSearchChange('Item 15');
            });
            expect(result.current.options).toEqual(originalOptions);
        });

        it('shows only server results after debounce fires in server mode', () => {
            const items = Array.from({length: 25}, (_, i) => ({
                id: String(i),
                name: `Item ${String(i).padStart(2, '0')}`
            }));
            const data: TestResponse = {items, isEnd: false};
            const {useQuery, state} = createMockQuery(data);

            const {result, rerender} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: (term): Record<string, string> => (term ? {filter: `name:~'${term}'`} : {}),
                localSearchFilter: defaultLocalFilter,
                limit: '25',
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            act(() => {
                result.current.onSearchChange('Item 15');
            });

            // Simulate server returning search results after debounce
            state.data = {items: [{id: '15', name: 'Item 15'}], isEnd: true};
            act(() => {
                vi.advanceTimersByTime(250);
            });
            rerender();

            // Should show only what the server returned
            expect(result.current.options).toEqual([{value: '15', label: 'Item 15'}]);
        });

        it('restores canonical order after clearing search in server mode', () => {
            const items = Array.from({length: 25}, (_, i) => ({
                id: String(i),
                name: `Item ${String(i).padStart(2, '0')}`
            }));
            const data: TestResponse = {items, isEnd: false};
            const {useQuery, state} = createMockQuery(data);

            const {result, rerender} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: (term): Record<string, string> => (term ? {filter: `name:~'${term}'`} : {}),
                localSearchFilter: defaultLocalFilter,
                limit: '25',
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            const originalOrder = result.current.options.map(o => o.label);

            // Search and simulate server returning results
            act(() => {
                result.current.onSearchChange('Item 15');
            });
            state.data = {items: [{id: '15', name: 'Item 15'}], isEnd: true};
            act(() => {
                vi.advanceTimersByTime(250);
            });
            rerender();

            // Clear search — options should use base (canonical order),
            // not the stale server search results
            act(() => {
                result.current.onSearchChange('');
            });
            rerender();

            expect(result.current.options.map(o => o.label)).toEqual(originalOrder);
        });

        it('does not contaminate allItems with search results during debounce window', () => {
            const items = Array.from({length: 25}, (_, i) => ({
                id: String(i),
                name: `Item ${String(i).padStart(2, '0')}`
            }));
            const data: TestResponse = {items, isEnd: false};
            const {useQuery, state} = createMockQuery(data);

            const {result, rerender} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: (term): Record<string, string> => (term ? {filter: `name:~'${term}'`} : {}),
                localSearchFilter: defaultLocalFilter,
                limit: '25',
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            // Search and get server results
            act(() => {
                result.current.onSearchChange('Item 15');
            });
            act(() => {
                vi.advanceTimersByTime(250);
            });
            state.data = {items: [{id: '15', name: 'Item 15'}], isEnd: true};
            rerender();

            // Clear search — data still has search results (debounce window)
            act(() => {
                result.current.onSearchChange('');
            });
            rerender();

            // allItems should still have the full original list, not search results
            expect(result.current.allItems.length).toBe(25);
        });
    });

    describe('local search filter', () => {
        it('filters data in local mode and returns modified data object', () => {
            const data: TestResponse = {
                items: [
                    {id: '1', name: 'Apple'},
                    {id: '2', name: 'Banana'},
                    {id: '3', name: 'Apricot'}
                ],
                isEnd: true
            };
            const {useQuery} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: defaultLocalFilter,
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            act(() => {
                result.current.onSearchChange('ap');
            });

            // Both data and items reflect the filter
            expect(result.current.items).toEqual([
                {id: '1', name: 'Apple'},
                {id: '3', name: 'Apricot'}
            ]);
            expect(result.current.data?.items).toEqual([
                {id: '1', name: 'Apple'},
                {id: '3', name: 'Apricot'}
            ]);
            // Other fields preserved
            expect(result.current.data?.isEnd).toBe(true);
        });

        it('uses custom localSearchFilter function', () => {
            const data: TestResponse = {
                items: [
                    {id: '1', name: 'Alpha'},
                    {id: '2', name: 'Beta'}
                ],
                isEnd: true
            };
            const {useQuery} = createMockQuery(data);

            // Custom filter that only matches exact ID
            const customFilter = (items: TestItem[], term: string) => items.filter(i => i.id === term);

            const {result} = renderHook(() => useFilterSearch({
                useQuery,
                dataKey: 'items',
                serverSearchParams: () => ({}),
                localSearchFilter: customFilter,
                toOption: defaultToOption,
                useGetById: defaultUseGetById
            }));

            act(() => {
                result.current.onSearchChange('2');
            });

            expect(result.current.items).toEqual([{id: '2', name: 'Beta'}]);
        });
    });
});
