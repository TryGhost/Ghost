import {FilterOption, ValueSource, ValueSourceParams, ValueSourceState} from '@tryghost/shade';
import {mergeFilterOptions} from './utils';
import {useDebounce} from 'use-debounce';
import {useMemo} from 'react';

export type ValueSourceHookOptions = {
    enabled?: boolean;
};

export type ValueSourceHook<T = string> = (options?: ValueSourceHookOptions) => ValueSource<T>;

export type PaginationState = {
    total: number;
    next: number | null;
};

export type BrowseState<Item> = {
    data: Item[] | undefined;
    isLoading: boolean;
    isRefreshing: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    loadMore: () => void;
    pagination?: PaginationState;
};

type HydrateState<Item> = {
    data: Item[] | undefined;
    isLoading: boolean;
};

export type RemoteProbeState<Item, T = string> = {
    items: Item[] | undefined;
    options: FilterOption<T>[];
    isLoading: boolean;
    pagination?: PaginationState;
};

interface RemoteValueSourceConfig<Item, T = string> {
    id: string;
    useBrowse: (query: string, options: ValueSourceHookOptions) => BrowseState<Item>;
    useHydrate?: (selectedValues: T[], options: ValueSourceHookOptions) => HydrateState<Item>;
    toOption: (item: Item) => FilterOption<T>;
    debounceMs?: number;
}

const NOOP = () => {};

export type RemoteValueSource<T = string, Item = unknown> = ValueSource<T> & {
    useInitialBrowse: () => RemoteProbeState<Item, T>;
};

export type RemoteValueSourceHook<T = string, Item = unknown> = (options?: ValueSourceHookOptions) => RemoteValueSource<T, Item>;

export function createRemoteValueSource<Item, T = string>(
    config: RemoteValueSourceConfig<Item, T>
): RemoteValueSourceHook<T, Item> {
    return function useRemoteValueSource(options = {}): RemoteValueSource<T, Item> {
        const {enabled = true} = options;

        const useInitialBrowse = (): RemoteProbeState<Item, T> => {
            const browse = config.useBrowse('', {enabled: true});
            const initialOptions = useMemo(() => {
                return (browse.data || []).map(config.toOption);
            }, [browse.data]);

            return {
                items: browse.data,
                options: initialOptions,
                isLoading: browse.isLoading,
                pagination: browse.pagination
            };
        };

        const useOptions = ({query, selectedValues}: ValueSourceParams<T>): ValueSourceState<T> => {
            const [debouncedQuery] = useDebounce(query, config.debounceMs ?? 200);
            const browse = config.useBrowse(debouncedQuery, {enabled});
            const hydrated = config.useHydrate?.(selectedValues, {enabled});

            const visibleOptions = useMemo(() => {
                return (browse.data || []).map(config.toOption);
            }, [browse.data]);

            const hydratedOptions = useMemo(() => {
                return (hydrated?.data || []).map(config.toOption);
            }, [hydrated?.data]);

            const mergedOptions = useMemo(() => {
                return mergeFilterOptions(hydratedOptions, visibleOptions);
            }, [hydratedOptions, visibleOptions]);

            if (!enabled) {
                return {
                    options: [],
                    isInitialLoad: false,
                    isSearching: false,
                    isLoadingMore: false,
                    hasMore: false,
                    loadMore: NOOP
                };
            }

            return {
                options: mergedOptions,
                isInitialLoad: browse.isLoading && mergedOptions.length === 0,
                isSearching: !browse.isLoading && browse.isRefreshing && !browse.isLoadingMore,
                isLoadingMore: browse.isLoadingMore,
                hasMore: browse.hasMore,
                loadMore: browse.loadMore ?? NOOP
            };
        };

        return {
            id: config.id,
            useInitialBrowse,
            useOptions
        };
    };
}
