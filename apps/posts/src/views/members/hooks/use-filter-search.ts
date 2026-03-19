import {useCallback, useMemo, useRef, useState} from 'react';
import type {FilterOption} from '@tryghost/shade';
import type {InfiniteQueryHookOptions} from '@tryghost/admin-x-framework/hooks';

// Extract the item type from an array property on T
type ArrayItem<T, K extends keyof T> = T[K] extends Array<infer Item> ? Item : never;

export interface UseFilterSearchOptions<T, K extends keyof T & string> {
    useQuery: (options?: InfiniteQueryHookOptions<T>) => {
        data: T | undefined;
        isLoading: boolean;
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

    const onSearchChange = useCallback((search: string) => {
        setInputValue(search);

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            setDebouncedValue(search);
        }, debounceMs);
    }, [debounceMs]);

    const searchParams = useMemo(() => {
        const params: Record<string, string> = {limit};
        const filters: string[] = [];

        if (baseFilter) {
            filters.push(baseFilter);
        }

        if (debouncedValue.trim() && buildSearchFilter) {
            filters.push(buildSearchFilter(escapeNqlValue(debouncedValue.trim())));
        }

        if (filters.length > 0) {
            params.filter = filters.join('+');
        }

        return params;
    }, [limit, baseFilter, debouncedValue, buildSearchFilter]);

    const {data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage} = useQuery({searchParams});

    const options = useMemo(() => {
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

    const onLoadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    return {
        options,
        isLoading: options.length === 0 && isLoading,
        searchValue: inputValue,
        onSearchChange,
        onLoadMore,
        hasMore: hasNextPage ?? false,
        isLoadingMore: isFetchingNextPage
    };
}
