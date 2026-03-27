import {useCallback, useMemo, useState} from 'react';
import type {Filter} from '@tryghost/shade';

interface QueryResult<Item, FieldName extends string> {
    data: { [key in FieldName]?: Item[] } | undefined;
    isLoading: boolean;
}

interface UseFilterOptionsParams<Item extends {id: string}, Option extends {value: string, label: string}, FieldName extends string> {
    knownItems: Item[];
    useSearch: (searchTerm: string) => QueryResult<Item, FieldName>;
    useGetById: (id: string, options?: {enabled?: boolean; defaultErrorHandler?: boolean}) => QueryResult<Item, FieldName>;
    searchFieldName: FieldName;
    filters: Filter[];
    filterFieldName: string;
    toOption: (item: Item) => Option;
}

/**
 * Generic filter dropdown hook that manages search state, fetches results,
 * merges with known items, and adds ID fallback for deleted items.
 */
export function useFilterOptions<Item extends {id: string}, Option extends {value: string, label: string}, FieldName extends string>({
    knownItems,
    useSearch,
    useGetById,
    filters,
    filterFieldName,
    searchFieldName,
    toOption
}: UseFilterOptionsParams<Item, Option, FieldName>) {
    const [searchValue, setSearchValue] = useState('');
    const {data, isLoading: isSearchLoading} = useSearch(searchValue);

    const activeFilterValue = useMemo(() => {
        const activeFilter = filters.find(f => f.field === filterFieldName);
        return activeFilter?.values[0] ? String(activeFilter.values[0]) : '';
    }, [filters, filterFieldName]);

    const shouldFetchById = useMemo(() => {
        if (!activeFilterValue) {
            return false;
        }

        if (knownItems.some(item => item.id === activeFilterValue)) {
            return false;
        }

        const searchResults = data?.[searchFieldName] ?? [];
        return !searchResults.some(item => item.id === activeFilterValue);
    }, [activeFilterValue, knownItems, data, searchFieldName]);

    const {data: byIdData, isLoading: isByIdLoading} = useGetById(activeFilterValue || '', {
        enabled: shouldFetchById,
        defaultErrorHandler: false
    });

    const isLoading = isSearchLoading || isByIdLoading;

    const transformToOption = useCallback((item: Item) => toOption(item), [toOption]);

    const options = useMemo(() => {
        const searchResults = data?.[searchFieldName] ?? [];
        const optionsMap: Record<string, Option> = {};
        
        // Start with known items from the list
        for (const item of knownItems) {
            optionsMap[item.id] = transformToOption(item);
        }
        
        // Add/update with search results (these take priority)
        for (const item of searchResults) {
            optionsMap[item.id] = transformToOption(item);
        }

        // Add/update with fetched-by-ID result if missing in known/search results
        const fetchedById = byIdData?.[searchFieldName]?.[0];
        if (fetchedById?.id) {
            optionsMap[fetchedById.id] = transformToOption(fetchedById);
        }

        // Add ID fallback for active filter on deleted items
        if (activeFilterValue && !(activeFilterValue in optionsMap)) {
            optionsMap[activeFilterValue] = {value: activeFilterValue, label: `ID: ${activeFilterValue}`} as Option;
        }
        
        return Object.values(optionsMap);
    }, [knownItems, data, searchFieldName, byIdData, activeFilterValue, transformToOption]);

    return {
        options,
        isLoading,
        searchValue,
        onSearchChange: setSearchValue
    };
}
