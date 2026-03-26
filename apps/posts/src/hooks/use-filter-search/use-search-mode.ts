import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDebounce} from 'use-debounce';

export interface UseSearchModeOptions {
    /** Build query params from the search term */
    serverSearchParams: (term: string) => Record<string, string>;
    limit?: string;
    debounceMs?: number;
}

export interface UseSearchModeReturn {
    searchValue: string;
    onSearchChange: (search: string) => void;
    /** null = undetermined, true = local, false = server */
    useLocalSearch: boolean | null;
    debouncedSearch: string;
    searchParams: Record<string, string>;
}

/**
 * Manages search state and auto-detects whether to use local or server search
 * based on whether all items fit on one page.
 *
 * Call `setSearchMode` after initial data loads to finalize the mode.
 */
export function useSearchMode({
    serverSearchParams,
    limit = '100',
    debounceMs = 250
}: UseSearchModeOptions): UseSearchModeReturn & {
    setSearchMode: (itemCount: number) => void;
} {
    const [searchValue, setSearchValue] = useState('');
    const [useLocalSearch, setUseLocalSearch] = useState<boolean | null>(null);

    const [debouncedSearch] = useDebounce(
        useLocalSearch === false ? searchValue : '',
        debounceMs
    );

    const searchParams = useMemo(() => {
        const params = serverSearchParams(
            useLocalSearch === false ? debouncedSearch : ''
        );
        if (!params.limit) {
            params.limit = limit;
        }
        return params;
    }, [serverSearchParams, useLocalSearch, debouncedSearch, limit]);

    const onSearchChange = useCallback((search: string) => {
        setSearchValue(search);
    }, []);

    const setSearchMode = useCallback((itemCount: number) => {
        if (useLocalSearch === null) {
            setUseLocalSearch(itemCount < Number.parseInt(limit));
        }
    }, [limit, useLocalSearch]);

    return {
        searchValue,
        onSearchChange,
        useLocalSearch,
        debouncedSearch,
        searchParams,
        setSearchMode
    };
}

/**
 * Effect that determines search mode once initial data loads.
 */
export function useSearchModeDetection<T, K extends keyof T>(
    data: T | undefined,
    dataKey: K,
    isLoading: boolean,
    setSearchMode: (itemCount: number) => void
) {
    useEffect(() => {
        if (isLoading || !data) {
            return;
        }

        const items = data[dataKey];
        if (!Array.isArray(items)) {
            setSearchMode(0);
            return;
        }

        setSearchMode(items.length);
    }, [data, dataKey, isLoading, setSearchMode]);
}
