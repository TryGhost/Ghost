import {useMemo, useRef} from 'react';
import {useResolveActiveValues} from './use-filter-search/use-resolve-active-values';
import {useSearchMode, useSearchModeDetection} from './use-filter-search/use-search-mode';
import type {Filter, FilterOption} from '@tryghost/shade';
import type {InfiniteQueryHookOptions} from '@tryghost/admin-x-framework/hooks';

type ArrayItem<T, K extends keyof T> = NonNullable<T[K]> extends Array<infer Item> ? Item : never;

export interface UseFilterSearchOptions<T, K extends keyof T & string> {
    useQuery: (options?: InfiniteQueryHookOptions<T>) => {
        data: T | undefined;
        isLoading: boolean;
        isFetching: boolean;
        fetchNextPage: () => void;
        hasNextPage?: boolean;
        isFetchingNextPage: boolean;
    };
    dataKey: K;
    serverSearchParams: (term: string) => Record<string, string>;
    localSearchFilter: (items: ArrayItem<T, K>[], term: string) => ArrayItem<T, K>[];
    limit?: string;
    debounceMs?: number;

    /** Map an item to a FilterOption */
    toOption: (item: ArrayItem<T, K>) => FilterOption<string>;
    /** Getter hook for resolving values not in the current page */
    useGetById: (id: string, opts: { enabled: boolean; defaultErrorHandler: boolean }) => { data: Pick<T, K> | undefined; isError: boolean };
    /** Current filter values that need to be displayable. Defaults to []. */
    activeValues?: string[];
}

export interface UseFilterSearchReturn<T, K extends keyof T & string> {
    data: T | undefined;
    items: ArrayItem<T, K>[];
    allItems: ArrayItem<T, K>[];
    /** Items resolved via useGetById for active values not in the current page */
    resolvedItems: ArrayItem<T, K>[];
    options: FilterOption<string>[];
    isLoading: boolean;
    isFetching: boolean;
    searchValue: string;
    onSearchChange: (search: string) => void;
    onLoadMore: () => void;
    hasMore: boolean;
    isLoadingMore: boolean;
}

/**
 * Extract active filter values for a given field from a filters array.
 */
export function getActiveFilterValues(filters: Filter[], ...fields: string[]): string[] {
    return filters
        .filter(f => fields.includes(f.field))
        .flatMap(f => f.values.map(String));
}

export function useFilterSearch<T, K extends keyof T & string>({
    useQuery,
    dataKey,
    serverSearchParams,
    localSearchFilter,
    limit = '100',
    debounceMs = 250,
    toOption,
    useGetById,
    activeValues = []
}: UseFilterSearchOptions<T, K>): UseFilterSearchReturn<T, K> {
    // --- Search mode & debouncing ---
    const {
        searchValue,
        onSearchChange,
        useLocalSearch,
        debouncedSearch,
        searchParams,
        setSearchMode
    } = useSearchMode({serverSearchParams, limit, debounceMs});

    // --- Data fetching ---
    const {
        data,
        isLoading,
        isFetching,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useQuery({searchParams, keepPreviousData: true});

    // Detect search mode once initial data loads
    useSearchModeDetection(data, dataKey, isLoading, setSearchMode);

    // --- Local filtering ---
    const filteredData = useMemo(() => {
        if (!data) {
            return undefined;
        }
        if (useLocalSearch && searchValue) {
            const rawItems = data[dataKey];
            if (!Array.isArray(rawItems)) {
                return data;
            }
            const filtered = localSearchFilter(rawItems as ArrayItem<T, K>[], searchValue);
            return {...data, [dataKey]: filtered} as T;
        }
        return data;
    }, [data, dataKey, localSearchFilter, searchValue, useLocalSearch]);

    // --- Base items tracking ---
    const baseAllItemsRef = useRef<ArrayItem<T, K>[]>([]);
    const isNonSearchData = !searchValue && (useLocalSearch !== false || !debouncedSearch);
    if (data && isNonSearchData) {
        const arr = data[dataKey];
        if (Array.isArray(arr) && arr.length > 0) {
            baseAllItemsRef.current = arr as ArrayItem<T, K>[];
        }
    }

    // --- Filtered items ---
    const items = useMemo(() => {
        if (!filteredData) {
            return [] as ArrayItem<T, K>[];
        }
        const arr = filteredData[dataKey];
        return (Array.isArray(arr) ? arr : []) as ArrayItem<T, K>[];
    }, [filteredData, dataKey]);

    // --- Resolve active values not in current page ---
    const {resolvedItems, resolvedRawItem} = useResolveActiveValues({
        dataKey,
        toOption,
        useGetById,
        activeValues,
        knownItems: baseAllItemsRef.current
    });

    // --- allItems (stable base snapshot) ---
    const allItems = useMemo(() => {
        return baseAllItemsRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, searchValue]);

    // --- Options list ---
    // cmdk's own filtering is disabled (shouldFilter={false}) so the hook
    // controls what's visible:
    // - Idle: full base snapshot in canonical order
    // - Local search: locally-filtered items
    // - Server search: server results once debounce fires, base during window
    const options = useMemo((): FilterOption<string>[] => {
        const seen = new Set<string>();
        const opts: FilterOption<string>[] = [];

        let primary: ArrayItem<T, K>[];
        if (!searchValue) {
            primary = baseAllItemsRef.current;
        } else if (useLocalSearch !== false) {
            primary = items;
        } else if (debouncedSearch) {
            primary = items;
        } else {
            primary = baseAllItemsRef.current;
        }
        for (const item of primary) {
            const opt = toOption(item);
            if (!seen.has(opt.value)) {
                seen.add(opt.value);
                opts.push(opt);
            }
        }

        // Append async-resolved items (selected values not in current data)
        for (const item of resolvedItems) {
            const opt = toOption(item);
            if (!seen.has(opt.value)) {
                seen.add(opt.value);
                opts.push(opt);
            }
        }

        return opts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toOption, items, resolvedRawItem, searchValue, useLocalSearch, debouncedSearch]);

    // --- Pagination ---
    const onLoadMore = useMemo(() => {
        return () => {
            if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        };
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    const hasMore = useLocalSearch ? false : (hasNextPage ?? false);

    return {
        data: filteredData,
        items,
        allItems,
        resolvedItems,
        options,
        isLoading: isLoading || (useLocalSearch === null && isFetching),
        isFetching,
        searchValue,
        onSearchChange,
        onLoadMore,
        hasMore,
        isLoadingMore: isFetchingNextPage
    };
}
