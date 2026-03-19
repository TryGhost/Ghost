import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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

function escapeNqlValue(term: string): string {
    return term.replace(/'/g, '\'\'');
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
    const [inputValue, setInputValue] = useState('');
    const [debouncedValue, setDebouncedValue] = useState('');
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    // Track whether the initial (no-search) query returned all items
    const useLocalSearchRef = useRef(false);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const onSearchChange = useCallback((search: string) => {
        setInputValue(search);

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        // Skip debounce + server query when filtering locally
        if (useLocalSearchRef.current) {
            return;
        }

        timerRef.current = setTimeout(() => {
            setDebouncedValue(search);
        }, debounceMs);
    }, [debounceMs]);

    // Only include search filter in query params when using server-side search
    const searchParams = useMemo(() => {
        const params: Record<string, string> = {limit};
        const filters: string[] = [];

        if (baseFilter) {
            filters.push(baseFilter);
        }

        if (!useLocalSearchRef.current && debouncedValue.trim() && buildSearchFilter) {
            filters.push(buildSearchFilter(escapeNqlValue(debouncedValue.trim())));
        }

        if (filters.length > 0) {
            params.filter = filters.join('+');
        }

        return params;
    }, [limit, baseFilter, debouncedValue, buildSearchFilter]);

    const {data, isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage} = useQuery({searchParams});

    const allOptions = useMemo(() => {
        if (!data) {
            return [];
        }
        const items = data[dataKey];
        if (!Array.isArray(items)) {
            return [];
        }
        return items.map((item: ArrayItem<T, K>) => ({
            value: String(item[valueKey]),
            label: String(item[labelKey])
        }));
    }, [data, dataKey, valueKey, labelKey]);

    // Once the initial load completes with all items on one page, switch to local search
    if (!isLoading && !hasNextPage && allOptions.length > 0 && !debouncedValue.trim()) {
        useLocalSearchRef.current = true;
    }

    const initialCountRef = useRef(0);
    if (!debouncedValue.trim() && allOptions.length > 0) {
        initialCountRef.current = allOptions.length;
    }

    // Apply local filtering when all items are loaded
    const options = useMemo(() => {
        if (useLocalSearchRef.current && inputValue.trim()) {
            const term = inputValue.trim().toLowerCase();
            return allOptions.filter(opt => opt.label.toLowerCase().includes(term));
        }
        return allOptions;
    }, [allOptions, inputValue]);

    const onLoadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    const isSearchPending = !useLocalSearchRef.current && inputValue !== debouncedValue && inputValue.trim() !== '';
    const isSearchFetching = !useLocalSearchRef.current && debouncedValue.trim() !== '' && isFetching;

    return {
        options,
        initialCount: initialCountRef.current,
        isLoading: (allOptions.length === 0 && isLoading) || isSearchPending || isSearchFetching,
        searchValue: inputValue,
        onSearchChange,
        onLoadMore,
        hasMore: hasNextPage ?? false,
        isLoadingMore: isFetchingNextPage
    };
}
