import {useCallback, useMemo, useState} from 'react';
import type {Filter} from '@tryghost/shade';

interface UseFilterOptionsParams<Item extends {id: string}, Option extends {value: string, label: string}, FieldName extends string> {
    knownItems: Item[];
    useSearch: (searchTerm: string) => {data: { [key in FieldName]?: Item[] } | undefined; isLoading: boolean};
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
    filters,
    filterFieldName,
    searchFieldName,
    toOption
}: UseFilterOptionsParams<Item, Option, FieldName>) {
    const [searchValue, setSearchValue] = useState('');
    const {data, isLoading} = useSearch(searchValue);
    const searchResults = data?.[searchFieldName] ?? [];

    const transformToOption = useCallback((item: Item) => toOption(item), [toOption]);

    const options = useMemo(() => {
        const optionsMap: Record<string, Option> = {};
        
        // Start with known items from the list
        for (const item of knownItems) {
            optionsMap[item.id] = transformToOption(item);
        }
        
        // Add/update with search results (these take priority)
        for (const item of searchResults ?? []) {
            optionsMap[item.id] = transformToOption(item);
        }

        // Add ID fallback for active filter on deleted items
        const activeFilter = filters.find(f => f.field === filterFieldName);
        if (activeFilter && activeFilter.values[0]) {
            const filterValue = String(activeFilter.values[0]);
            if (!(filterValue in optionsMap)) {
                optionsMap[filterValue] = {value: filterValue, label: `ID: ${filterValue}`} as Option;
            }
        }
        
        return Object.values(optionsMap);
    }, [knownItems, searchResults, filters, filterFieldName, transformToOption]);

    return {
        options,
        isLoading,
        searchValue,
        onSearchChange: setSearchValue
    };
}

