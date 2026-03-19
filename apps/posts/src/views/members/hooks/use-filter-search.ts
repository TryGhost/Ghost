import {useCallback, useMemo, useRef, useState} from 'react';
import type {FilterOption} from '@tryghost/shade';

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

interface UseFilterSearchOptions<T> {
    queryResult: {
        data: T | undefined;
        isLoading: boolean;
        fetchNextPage: () => void;
        hasNextPage?: boolean;
        isFetchingNextPage: boolean;
    };
    extractItems: (data: T) => Array<{ value: string; label: string }>;
}

/**
 * Build a debounced NQL filter param for server-side search.
 * Returns `searchParams` to merge into the query hook call.
 */
export function useFilterSearchParams(buildSearchFilter: (term: string) => string) {
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
        }, 250);
    }, []);

    const searchParams = useMemo(() => {
        const params: Record<string, string> = {};

        if (debouncedValue.trim()) {
            params.filter = buildSearchFilter(escapeNqlValue(debouncedValue.trim()));
        }

        return params;
    }, [debouncedValue, buildSearchFilter]);

    return {
        searchValue: inputValue,
        onSearchChange,
        searchParams
    };
}

/**
 * Combine an infinite query result with search state into a unified
 * filter-search return value.
 */
export function useFilterSearch<T>({
    queryResult,
    extractItems
}: UseFilterSearchOptions<T>): Omit<UseFilterSearchReturn, 'searchValue' | 'onSearchChange'> {
    const {data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage} = queryResult;

    const options = useMemo(() => {
        if (!data) {
            return [];
        }
        return extractItems(data);
    }, [data, extractItems]);

    const onLoadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    return {
        options,
        isLoading: options.length === 0 && isLoading,
        onLoadMore,
        hasMore: hasNextPage ?? false,
        isLoadingMore: isFetchingNextPage
    };
}
