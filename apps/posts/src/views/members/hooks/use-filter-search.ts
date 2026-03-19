import {useCallback, useMemo, useRef, useState} from 'react';
import type {FilterOption} from '@tryghost/shade';
import type {InfiniteQueryHookOptions} from '@tryghost/admin-x-framework/hooks';

export interface UseFilterSearchOptions<T> {
    useQuery: (options?: InfiniteQueryHookOptions<T>) => {
        data: T | undefined;
        isLoading: boolean;
        fetchNextPage: () => void;
        hasNextPage?: boolean;
        isFetchingNextPage: boolean;
    };
    extractItems: (data: T) => Array<{ value: string; label: string }>;
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

export function useFilterSearch<T>({
    useQuery,
    extractItems,
    buildSearchFilter,
    limit = '100',
    debounceMs = 250
}: UseFilterSearchOptions<T>): UseFilterSearchReturn {
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

        if (debouncedValue.trim() && buildSearchFilter) {
            params.filter = buildSearchFilter(escapeNqlValue(debouncedValue.trim()));
        }

        return params;
    }, [limit, debouncedValue, buildSearchFilter]);

    const {data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage} = useQuery({searchParams});

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
        searchValue: inputValue,
        onSearchChange,
        onLoadMore,
        hasMore: hasNextPage ?? false,
        isLoadingMore: isFetchingNextPage
    };
}
