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

/** Base options shared by all tests — spread and override as needed */
function defaultHookOptions(useQuery: ReturnType<typeof createMockQuery>['useQuery'], overrides?: Partial<UseFilterSearchOptions<TestResponse, 'items'>>) {
    return {
        useQuery,
        dataKey: 'items' as const,
        serverSearchParams: () => ({}) as Record<string, string>,
        localSearchFilter: defaultLocalFilter,
        toOption: defaultToOption,
        useGetById: defaultUseGetById,
        ...overrides
    };
}

/** Create a full-page dataset that triggers server search mode */
function createServerModeData(count = 25): {data: TestResponse; limit: string} {
    const items = Array.from({length: count}, (_, i) => ({
        id: String(i),
        name: `Item ${String(i).padStart(2, '0')}`
    }));
    return {data: {items, isEnd: false}, limit: String(count)};
}

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

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery)));

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

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery)));

            expect(result.current.isLoading).toBe(false);
            expect(result.current.items).toEqual(data.items);
            expect(result.current.data).toEqual(data);
        });

        it('returns empty items when dataKey contains non-array', () => {
            const data = {items: 'not-an-array', isEnd: true} as unknown as TestResponse;
            const {useQuery} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery)));

            expect(result.current.items).toEqual([]);
        });
    });

    describe('local search mode', () => {
        const localData: TestResponse = {
            items: [
                {id: '1', name: 'Alpha'},
                {id: '2', name: 'Beta'},
                {id: '3', name: 'Gamma'}
            ],
            isEnd: true
        };

        it('uses local search when items fit on one page (count < limit)', () => {
            const {useQuery, state} = createMockQuery(localData);

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {
                serverSearchParams: (term): Record<string, string> => (term ? {filter: `name:~'${term}'`} : {}),
                limit: '100'
            })));

            act(() => {
                result.current.onSearchChange('alpha');
            });

            expect(result.current.items).toEqual([{id: '1', name: 'Alpha'}]);
            expect(result.current.searchValue).toBe('alpha');
            expect(state.lastSearchParams).not.toHaveProperty('filter', expect.stringContaining('alpha'));
        });

        it('keeps allItems stable during local search filtering', () => {
            const {useQuery} = createMockQuery(localData);

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery)));

            expect(result.current.allItems).toHaveLength(3);

            act(() => {
                result.current.onSearchChange('alpha');
            });
            expect(result.current.items).toHaveLength(1);
            expect(result.current.allItems).toHaveLength(3);
        });

        it('returns all items when search is cleared in local mode', () => {
            const {useQuery} = createMockQuery({
                items: [{id: '1', name: 'Alpha'}, {id: '2', name: 'Beta'}],
                isEnd: true
            });

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery)));

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
            const {useQuery} = createMockQuery({items: [{id: '1', name: 'Alpha'}], isEnd: true});

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery)));

            expect(result.current.hasMore).toBe(false);
        });

        it('does not debounce in local search mode', () => {
            const {useQuery} = createMockQuery({
                items: [{id: '1', name: 'Alpha'}, {id: '2', name: 'Beta'}],
                isEnd: true
            });

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {debounceMs: 500})));

            act(() => {
                result.current.onSearchChange('alpha');
            });

            expect(result.current.items).toEqual([{id: '1', name: 'Alpha'}]);
        });
    });

    describe('server search mode', () => {
        const filterSearchParams = (term: string): Record<string, string> => (term ? {filter: `name:~'${term}'`} : {});

        it('uses server search when items fill the page (count >= limit)', () => {
            const {data, limit} = createServerModeData();
            const {useQuery, state} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {
                serverSearchParams: filterSearchParams, limit
            })));

            act(() => {
                result.current.onSearchChange('test');
            });
            expect(state.lastSearchParams?.filter).toBeUndefined();

            act(() => {
                vi.advanceTimersByTime(250);
            });
            expect(state.lastSearchParams?.filter).toBe('name:~\'test\'');
        });

        it('debounces server search calls', () => {
            const {data, limit} = createServerModeData();
            const {useQuery, state} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {
                serverSearchParams: (term): Record<string, string> => (term ? {search: term} : {}),
                limit,
                debounceMs: 300
            })));

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

            expect(state.lastSearchParams?.search).toBeUndefined();

            act(() => {
                vi.advanceTimersByTime(300);
            });
            expect(state.lastSearchParams?.search).toBe('abc');
        });

        it('passes non-filter search params to server', () => {
            const {data, limit} = createServerModeData(50);
            const {useQuery, state} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {
                serverSearchParams: (term): Record<string, string> => (term ? {search: term} : {}),
                limit
            })));

            act(() => {
                result.current.onSearchChange('query');
            });
            act(() => {
                vi.advanceTimersByTime(250);
            });

            expect(state.lastSearchParams?.search).toBe('query');
        });

        it('combines base filter with search term', () => {
            const {data} = createServerModeData(100);
            const {useQuery, state} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {
                serverSearchParams: term => ({
                    filter: term ? `type:paid+name:~'${term}'` : 'type:paid'
                })
            })));

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
            const {useQuery} = createMockQuery({items: [], isEnd: true});

            renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {serverSearchParams})));

            expect(serverSearchParams).toHaveBeenCalledWith('');
        });

        it('applies default limit when not specified in params', () => {
            const {useQuery, state} = createMockQuery({items: [], isEnd: true});

            renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {limit: '50'})));

            expect(state.lastSearchParams?.limit).toBe('50');
        });

        it('does not override limit when specified in params', () => {
            const {useQuery, state} = createMockQuery({items: [], isEnd: true});

            renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {
                serverSearchParams: () => ({limit: '25'}),
                limit: '100'
            })));

            expect(state.lastSearchParams?.limit).toBe('25');
        });
    });

    describe('infinite scroll', () => {
        it('calls fetchNextPage on onLoadMore when hasNextPage', () => {
            const {data, limit} = createServerModeData();
            const {useQuery, state} = createMockQuery(data);
            state.hasNextPage = true;

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {limit})));

            act(() => {
                result.current.onLoadMore();
            });

            expect(state.fetchNextPage).toHaveBeenCalled();
        });

        it('does not call fetchNextPage when no next page', () => {
            const {useQuery, state} = createMockQuery({items: [{id: '1', name: 'Alpha'}], isEnd: true});
            state.hasNextPage = false;

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery)));

            act(() => {
                result.current.onLoadMore();
            });

            expect(state.fetchNextPage).not.toHaveBeenCalled();
        });

        it('does not call fetchNextPage when already fetching next page', () => {
            const {data, limit} = createServerModeData();
            const {useQuery, state} = createMockQuery(data);
            state.hasNextPage = true;
            state.isFetchingNextPage = true;

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {limit})));

            act(() => {
                result.current.onLoadMore();
            });

            expect(state.fetchNextPage).not.toHaveBeenCalled();
        });

        it('reports hasMore from hasNextPage in server mode', () => {
            const {data, limit} = createServerModeData();
            const {useQuery, state} = createMockQuery(data);
            state.hasNextPage = true;

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {limit})));

            expect(result.current.hasMore).toBe(true);
        });

        it('reports isLoadingMore from isFetchingNextPage', () => {
            const {data, limit} = createServerModeData();
            const {useQuery, state} = createMockQuery(data);
            state.isFetchingNextPage = true;

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {limit})));

            expect(result.current.isLoadingMore).toBe(true);
        });
    });

    describe('search value', () => {
        it('exposes current search value', () => {
            const {useQuery} = createMockQuery({items: [], isEnd: true});

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery)));

            expect(result.current.searchValue).toBe('');

            act(() => {
                result.current.onSearchChange('test');
            });

            expect(result.current.searchValue).toBe('test');
        });
    });

    describe('options filtering and ordering', () => {
        const fourItemData: TestResponse = {
            items: [
                {id: '1', name: 'Alpha'},
                {id: '2', name: 'Beta'},
                {id: '3', name: 'Gamma'},
                {id: '4', name: 'Delta'}
            ],
            isEnd: true
        };

        const serverFilterParams = (term: string): Record<string, string> => (term ? {filter: `name:~'${term}'`} : {});

        it('returns only matching options during search in local mode', () => {
            const {useQuery} = createMockQuery(fourItemData);

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery)));

            expect(result.current.options.map(o => o.label)).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);

            act(() => {
                result.current.onSearchChange('alph');
            });
            expect(result.current.options.map(o => o.label)).toEqual(['Alpha']);
        });

        it('restores canonical order after clearing search in local mode', () => {
            const {useQuery} = createMockQuery(fourItemData);

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery)));

            const originalOrder = result.current.options.map(o => o.label);

            act(() => {
                result.current.onSearchChange('gamma');
            });
            expect(result.current.options.map(o => o.label)).toEqual(['Gamma']);

            act(() => {
                result.current.onSearchChange('');
            });
            expect(result.current.options.map(o => o.label)).toEqual(originalOrder);
        });

        it('shows base options during debounce window in server mode', () => {
            const {data, limit} = createServerModeData();
            const {useQuery} = createMockQuery(data);

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {
                serverSearchParams: serverFilterParams, limit
            })));

            const originalOptions = result.current.options;

            act(() => {
                result.current.onSearchChange('Item 15');
            });
            expect(result.current.options).toEqual(originalOptions);
        });

        it('shows only server results after debounce fires in server mode', () => {
            const {data, limit} = createServerModeData();
            const {useQuery, state} = createMockQuery(data);

            const {result, rerender} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {
                serverSearchParams: serverFilterParams, limit
            })));

            act(() => {
                result.current.onSearchChange('Item 15');
            });

            state.data = {items: [{id: '15', name: 'Item 15'}], isEnd: true};
            act(() => {
                vi.advanceTimersByTime(250);
            });
            rerender();

            expect(result.current.options).toEqual([{value: '15', label: 'Item 15'}]);
        });

        it('restores canonical order after clearing search in server mode', () => {
            const {data, limit} = createServerModeData();
            const {useQuery, state} = createMockQuery(data);

            const {result, rerender} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {
                serverSearchParams: serverFilterParams, limit
            })));

            const originalOrder = result.current.options.map(o => o.label);

            act(() => {
                result.current.onSearchChange('Item 15');
            });
            state.data = {items: [{id: '15', name: 'Item 15'}], isEnd: true};
            act(() => {
                vi.advanceTimersByTime(250);
            });
            rerender();

            act(() => {
                result.current.onSearchChange('');
            });
            rerender();

            expect(result.current.options.map(o => o.label)).toEqual(originalOrder);
        });

        it('does not contaminate allItems with search results during debounce window', () => {
            const {data, limit} = createServerModeData();
            const {useQuery, state} = createMockQuery(data);

            const {result, rerender} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {
                serverSearchParams: serverFilterParams, limit
            })));

            act(() => {
                result.current.onSearchChange('Item 15');
            });
            act(() => {
                vi.advanceTimersByTime(250);
            });
            state.data = {items: [{id: '15', name: 'Item 15'}], isEnd: true};
            rerender();

            act(() => {
                result.current.onSearchChange('');
            });
            rerender();

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

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery)));

            act(() => {
                result.current.onSearchChange('ap');
            });

            expect(result.current.items).toEqual([
                {id: '1', name: 'Apple'},
                {id: '3', name: 'Apricot'}
            ]);
            expect(result.current.data?.items).toEqual([
                {id: '1', name: 'Apple'},
                {id: '3', name: 'Apricot'}
            ]);
            expect(result.current.data?.isEnd).toBe(true);
        });

        it('uses custom localSearchFilter function', () => {
            const {useQuery} = createMockQuery({
                items: [{id: '1', name: 'Alpha'}, {id: '2', name: 'Beta'}],
                isEnd: true
            });

            const {result} = renderHook(() => useFilterSearch(defaultHookOptions(useQuery, {
                localSearchFilter: (items, term) => items.filter(i => i.id === term)
            })));

            act(() => {
                result.current.onSearchChange('2');
            });

            expect(result.current.items).toEqual([{id: '2', name: 'Beta'}]);
        });
    });
});
