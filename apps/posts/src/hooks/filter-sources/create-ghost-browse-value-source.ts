import {FilterOption} from '@tryghost/shade';
import {PaginationState, ValueSourceHookOptions, createRemoteValueSource} from './create-remote-value-source';
import {buildQuotedListFilter} from './utils';

type GhostBrowseResponse = {
    meta?: {
        pagination?: PaginationState;
    };
};

type InfiniteBrowseResult<Data> = {
    data: Data | undefined;
    isLoading: boolean;
    isFetching: boolean;
    isFetchingNextPage: boolean;
    hasNextPage?: boolean;
    fetchNextPage: () => void;
};

interface CreateGhostBrowseValueSourceConfig<Item, Data> {
    id: string;
    buildBrowseSearchParams: (query: string) => Record<string, string>;
    buildHydrateSearchParams?: (selectedFilter: string) => Record<string, string>;
    buildHydrateFilter?: (selectedValues: string[]) => string | undefined;
    debounceMs?: number;
    selectItems: (data: Data | undefined) => Item[] | undefined;
    toOption: (item: Item) => FilterOption<string>;
    useQuery: (
        options: {enabled: boolean; searchParams: Record<string, string>}
    ) => InfiniteBrowseResult<Data>;
}

function defaultHydrateSearchParams(selectedFilter: string) {
    return {filter: selectedFilter};
}

function defaultHydrateFilter(selectedValues: string[]) {
    return buildQuotedListFilter('id', selectedValues);
}

function withDefaultBrowseLimit(searchParams: Record<string, string>) {
    return {
        limit: '100',
        ...searchParams
    };
}

export function createGhostBrowseValueSource<Item, Data extends GhostBrowseResponse>({
    id,
    buildBrowseSearchParams,
    buildHydrateSearchParams = defaultHydrateSearchParams,
    buildHydrateFilter = defaultHydrateFilter,
    debounceMs,
    selectItems,
    toOption,
    useQuery
}: CreateGhostBrowseValueSourceConfig<Item, Data>) {
    return createRemoteValueSource<Item>({
        id,
        useBrowse: (query, options: ValueSourceHookOptions) => {
            const result = useQuery({
                enabled: options.enabled ?? true,
                searchParams: withDefaultBrowseLimit(buildBrowseSearchParams(query))
            });

            return {
                data: selectItems(result.data),
                isLoading: result.isLoading,
                isRefreshing: result.isFetching,
                isLoadingMore: result.isFetchingNextPage,
                hasMore: !!result.hasNextPage,
                loadMore: result.fetchNextPage,
                pagination: result.data?.meta?.pagination
            };
        },
        useHydrate: (selectedValues, options: ValueSourceHookOptions) => {
            const selectedFilter = buildHydrateFilter(selectedValues);
            const searchParams: Record<string, string> = {};
            const hasSelectedFilter = typeof selectedFilter === 'string';

            if (hasSelectedFilter) {
                Object.assign(searchParams, withDefaultBrowseLimit(buildHydrateSearchParams(selectedFilter)));
            }

            const result = useQuery({
                enabled: (options.enabled ?? true) && selectedValues.length > 0,
                searchParams
            });

            return {
                data: selectItems(result.data),
                isLoading: result.isLoading
            };
        },
        toOption,
        debounceMs
    });
}
