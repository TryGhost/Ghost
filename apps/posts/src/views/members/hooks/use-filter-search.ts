import {useInfiniteSearch} from '@src/hooks/use-infinite-search';
import {useMemo, useRef} from 'react';
import type {FilterOption} from '@tryghost/shade';
import type {InfiniteQueryHookOptions} from '@tryghost/admin-x-framework/hooks';

// Extract the item type from an array property on T
type ArrayItem<T, K extends keyof T> = T[K] extends Array<infer Item> ? Item : never;

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
    valueKey: keyof ArrayItem<T, K> & string;
    labelKey: keyof ArrayItem<T, K> & string;
    baseFilter?: string;
    buildSearchFilter?: (term: string) => string;
    limit?: string;
    debounceMs?: number;
}

export interface UseFilterSearchReturn {
    options: FilterOption<string>[];
    initialCount: number;
    isLoading: boolean;
    searchValue: string;
    onSearchChange: (search: string) => void;
    onLoadMore: () => void;
    hasMore: boolean;
    isLoadingMore: boolean;
}

export function useFilterSearch<T, K extends keyof T & string>({
    useQuery,
    dataKey,
    valueKey,
    labelKey,
    baseFilter,
    buildSearchFilter,
    limit = '100',
    debounceMs = 250
}: UseFilterSearchOptions<T, K>): UseFilterSearchReturn {
    const search = useInfiniteSearch({
        useQuery,
        baseFilter,
        buildSearchFilter,
        limit,
        debounceMs,
        hasData: data => Array.isArray(data[dataKey]) && (data[dataKey] as unknown[]).length > 0
    });

    const allOptions = useMemo(() => {
        if (!search.data) {
            return [];
        }
        const items = search.data[dataKey];
        if (!Array.isArray(items)) {
            return [];
        }
        return items.map((item: ArrayItem<T, K>) => ({
            value: String(item[valueKey]),
            label: String(item[labelKey])
        }));
    }, [search.data, dataKey, valueKey, labelKey]);

    // Track count from initial unfiltered results.  Set during render (not
    // useEffect) so the value is available in the same render pass.
    const initialCountRef = useRef(0);
    if (allOptions.length > 0 && (search.isLocalSearch || search.searchValue.trim() === '')) {
        initialCountRef.current = allOptions.length;
    }

    // Apply local filtering when all items are loaded
    const options = useMemo(() => {
        if (search.isLocalSearch && search.searchValue.trim()) {
            const term = search.searchValue.trim().toLowerCase();
            return allOptions.filter(opt => opt.label.toLowerCase().includes(term));
        }
        return allOptions;
    }, [allOptions, search.isLocalSearch, search.searchValue]);

    return {
        options,
        initialCount: initialCountRef.current,
        isLoading: (allOptions.length === 0 && search.isLoading) || search.isSearchLoading,
        searchValue: search.searchValue,
        onSearchChange: search.onSearchChange,
        onLoadMore: search.onLoadMore,
        hasMore: search.hasMore,
        isLoadingMore: search.isLoadingMore
    };
}
