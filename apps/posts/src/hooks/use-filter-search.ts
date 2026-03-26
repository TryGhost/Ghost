import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useDebounce} from 'use-debounce';
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
    useGetById: useResolveById,
    activeValues = []
}: UseFilterSearchOptions<T, K>): UseFilterSearchReturn<T, K> {
    const [searchValue, setSearchValue] = useState('');

    // Track whether we've determined search mode
    const [useLocalSearch, setUseLocalSearch] = useState<boolean | null>(null);

    // Debounce search for server search mode; local search uses value immediately
    const [debouncedSearch] = useDebounce(
        useLocalSearch === false ? searchValue : '',
        debounceMs
    );

    // Build search params — use debounced term for server search, empty for local
    const searchParams = useMemo(() => {
        const params = serverSearchParams(
            useLocalSearch === false ? debouncedSearch : ''
        );
        if (!params.limit) {
            params.limit = limit;
        }
        return params;
    }, [serverSearchParams, useLocalSearch, debouncedSearch, limit]);

    const {
        data,
        isLoading,
        isFetching,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useQuery({searchParams, keepPreviousData: true});

    // Determine search mode once initial data loads
    useEffect(() => {
        if (useLocalSearch !== null || isLoading || !data) {
            return;
        }

        const items = data[dataKey];
        if (!Array.isArray(items)) {
            setUseLocalSearch(true);
            return;
        }

        // If we got fewer items than the limit, all data fits on one page
        setUseLocalSearch(items.length < parseInt(limit));
    }, [data, dataKey, isLoading, limit, useLocalSearch]);

    // Apply local filtering only in local search mode.
    // In server mode, items come directly from the API response so the dropdown
    // shows exactly what the server matched — no first-page items mixed in.
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

    // Base items — captured from the initial (non-searched) query and stable during search.
    // Use for field visibility checks and resolving selected values.
    const baseAllItemsRef = useRef<ArrayItem<T, K>[]>([]);
    // Only update base when we have non-search data. In server search mode,
    // searchValue clears immediately but debouncedSearch lags behind — data still
    // holds stale search results during that window, so guard against it.
    const isNonSearchData = !searchValue && (useLocalSearch !== false || !debouncedSearch);
    if (data && isNonSearchData) {
        const arr = data[dataKey];
        if (Array.isArray(arr) && arr.length > 0) {
            baseAllItemsRef.current = arr as ArrayItem<T, K>[];
        }
    }

    // Filtered items — changes with search, use for populating dropdown options
    const items = useMemo(() => {
        if (!filteredData) {
            return [] as ArrayItem<T, K>[];
        }
        const arr = filteredData[dataKey];
        return (Array.isArray(arr) ? arr : []) as ArrayItem<T, K>[];
    }, [filteredData, dataKey]);

    // --- Resolve-by-ID for active filter values not in the current page ---

    // Async-resolved items used only for populating dropdown options.
    // Append-only; items are never removed.
    const resolvedForOptionsRef = useRef<ArrayItem<T, K>[]>([]);
    // Track IDs that failed resolution (e.g. wrong resource type) to avoid retrying
    const failedResolutionsRef = useRef(new Set<string>());

    // Find the first active value missing from base + resolved (needs async fetch)
    const resolvedValues = resolvedForOptionsRef.current;
    const missingValue = useMemo(() => {
        if (activeValues.length === 0) {
            return '';
        }
        const knownValues = new Set<string>();
        for (const item of baseAllItemsRef.current) {
            knownValues.add(toOption(item).value);
        }
        for (const item of resolvedValues) {
            knownValues.add(toOption(item).value);
        }
        return activeValues.find(v => !knownValues.has(v) && !failedResolutionsRef.current.has(v)) || '';
    }, [activeValues, resolvedValues, toOption]);

    // Resolve via useGetById — always called (hooks must be unconditional)
    const resolvedResult = useResolveById(missingValue || '', {
        enabled: !!missingValue,
        defaultErrorHandler: false
    });

    // Extract resolved raw item from the fetch result
    const resolvedRawItem = useMemo((): ArrayItem<T, K> | null => {
        if (!resolvedResult.data || !missingValue) {
            return null;
        }
        const arr = resolvedResult.data[dataKey];
        if (Array.isArray(arr) && arr.length > 0) {
            return arr[0] as ArrayItem<T, K>;
        }
        return null;
    }, [resolvedResult.data, missingValue, dataKey]);

    // Track failed resolutions so we skip them on future renders
    if (missingValue && resolvedResult.isError) {
        failedResolutionsRef.current.add(missingValue);
    }

    // Append async-resolved item to the ref
    if (resolvedRawItem) {
        const resolvedValue = toOption(resolvedRawItem).value;
        if (!resolvedForOptionsRef.current.some(existing => toOption(existing).value === resolvedValue)) {
            resolvedForOptionsRef.current = [...resolvedForOptionsRef.current, resolvedRawItem];
        }
    }

    // allItems = base snapshot (stable, unfiltered by search)
    const allItems = useMemo(() => {
        return baseAllItemsRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, searchValue]);

    // Build options list. cmdk's own filtering is disabled (shouldFilter={false})
    // to prevent DOM reordering, so the hook controls what's visible.
    //
    // - Idle (no search): show full base snapshot in canonical order
    // - Local search mode: show locally-filtered items
    // - Server search mode: show server results once available (debouncedSearch
    //   is non-empty), otherwise keep showing base during the debounce window
    const options = useMemo((): FilterOption<string>[] => {
        const seen = new Set<string>();
        const opts: FilterOption<string>[] = [];

        let primary: ArrayItem<T, K>[];
        if (!searchValue) {
            primary = baseAllItemsRef.current;
        } else if (useLocalSearch !== false) {
            // Local mode: items are already filtered by localSearchFilter
            primary = items;
        } else if (debouncedSearch) {
            // Server mode with active query: show server results
            primary = items;
        } else {
            // Server mode debounce window: keep showing base
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
        for (const item of resolvedForOptionsRef.current) {
            const opt = toOption(item);
            if (!seen.has(opt.value)) {
                seen.add(opt.value);
                opts.push(opt);
            }
        }

        return opts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toOption, items, resolvedRawItem, searchValue, useLocalSearch, debouncedSearch]);

    const onSearchChange = useCallback((search: string) => {
        setSearchValue(search);
    }, []);

    const onLoadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    // In local search mode, there's never more to load (we have all data)
    // In server search mode, defer to hasNextPage
    const hasMore = useLocalSearch ? false : (hasNextPage ?? false);

    return {
        data: filteredData,
        items,
        allItems,
        resolvedItems: resolvedForOptionsRef.current,
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
