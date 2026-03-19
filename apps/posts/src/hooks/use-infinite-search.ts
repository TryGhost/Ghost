import {useCallback, useMemo, useRef, useState} from 'react';
import {useDebounce} from 'use-debounce';
import type {InfiniteQueryHookOptions} from '@tryghost/admin-x-framework/hooks';

export interface UseInfiniteSearchOptions<T> {
    useQuery: (options?: InfiniteQueryHookOptions<T>) => {
        data: T | undefined;
        isLoading: boolean;
        isFetching: boolean;
        fetchNextPage: () => void;
        hasNextPage?: boolean;
        isFetchingNextPage: boolean;
    };
    baseFilter?: string;
    buildSearchFilter?: (term: string) => string;
    limit?: string;
    debounceMs?: number;
    /** Return true when the query data contains at least one item. Used to decide
     *  whether to switch to local search. Defaults to checking data is non-undefined. */
    hasData?: (data: T) => boolean;
}

export interface UseInfiniteSearchReturn<T> {
    data: T | undefined;
    isLoading: boolean;
    isSearchLoading: boolean;
    searchValue: string;
    onSearchChange: (value: string) => void;
    onLoadMore: () => void;
    hasMore: boolean;
    isLoadingMore: boolean;
    isLocalSearch: boolean;
}

export function useInfiniteSearch<T>({
    useQuery,
    baseFilter,
    buildSearchFilter,
    limit = '100',
    debounceMs = 250,
    hasData = () => true
}: UseInfiniteSearchOptions<T>): UseInfiniteSearchReturn<T> {
    const [inputValue, setInputValue] = useState('');

    // Decided once on the first unfiltered page load: if all items fit on a
    // single page we use local search for the lifetime of this hook instance.
    // Using refs (rather than state) avoids an extra re-render cycle since
    // `serverSearchTerm` reads `isUsingLocalSearchRef` synchronously.
    const searchModeDecidedRef = useRef(false);
    const isUsingLocalSearchRef = useRef(false);

    const [debouncedValue] = useDebounce(inputValue, debounceMs);
    const serverSearchTerm = isUsingLocalSearchRef.current ? '' : debouncedValue;

    const searchParams = useMemo(() => {
        const params: Record<string, string> = {limit};
        const filters: string[] = [];

        if (baseFilter) {
            filters.push(baseFilter);
        }

        if (serverSearchTerm.trim() && buildSearchFilter) {
            filters.push(buildSearchFilter(serverSearchTerm.trim()));
        }

        if (filters.length > 0) {
            params.filter = filters.join('+');
        }

        return params;
    }, [limit, baseFilter, serverSearchTerm, buildSearchFilter]);

    const {data, isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage} = useQuery({searchParams});

    // On the first unfiltered data load, decide whether to use local or server
    // search.  Only evaluated once — subsequent searches that happen to return a
    // single page should not flip the mode.  Set during render (not useEffect)
    // so `serverSearchTerm` reads the updated value in the same render pass.
    const isInitialPageLoad = !searchModeDecidedRef.current && !isLoading && data && hasData(data) && !serverSearchTerm.trim();
    if (isInitialPageLoad) {
        searchModeDecidedRef.current = true;
        isUsingLocalSearchRef.current = !hasNextPage;
    }

    const onLoadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    const isSearchPending = !isUsingLocalSearchRef.current && inputValue !== debouncedValue && inputValue.trim() !== '';
    const isSearchFetching = !isUsingLocalSearchRef.current && debouncedValue.trim() !== '' && isFetching;

    return {
        data,
        isLoading,
        isSearchLoading: isSearchPending || isSearchFetching,
        searchValue: inputValue,
        onSearchChange: setInputValue,
        onLoadMore,
        hasMore: hasNextPage ?? false,
        isLoadingMore: isFetchingNextPage,
        isLocalSearch: isUsingLocalSearchRef.current
    };
}
