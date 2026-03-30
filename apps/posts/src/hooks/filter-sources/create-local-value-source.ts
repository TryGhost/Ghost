import {FilterOption, ValueSource, ValueSourceParams, ValueSourceState} from '@tryghost/shade';
import {ValueSourceHook, ValueSourceHookOptions} from './create-remote-value-source';
import {filterOptionsByQuery} from './utils';

type LocalState<Item> = {
    data: Item[] | undefined;
    isLoading: boolean;
};

interface LocalValueSourceConfig<Item, T = string> {
    id: string;
    useItems: (options: ValueSourceHookOptions) => LocalState<Item>;
    toOption: (item: Item) => FilterOption<T>;
    filterOptions?: (options: FilterOption<T>[], query: string) => FilterOption<T>[];
}

const NOOP = () => {};

export function createLocalValueSource<Item, T = string>(
    config: LocalValueSourceConfig<Item, T>
): ValueSourceHook<T> {
    return function useLocalValueSource(options = {}): ValueSource<T> {
        const {enabled = true} = options;

        const useOptions = ({query}: ValueSourceParams<T>): ValueSourceState<T> => {
            const items = config.useItems({enabled});
            const allOptions = (items.data || []).map(config.toOption);
            const filteredOptions = config.filterOptions
                ? config.filterOptions(allOptions, query)
                : filterOptionsByQuery(allOptions, query);

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
                options: filteredOptions,
                isInitialLoad: items.isLoading && allOptions.length === 0,
                isSearching: false,
                isLoadingMore: false,
                hasMore: false,
                loadMore: NOOP
            };
        };

        return {
            id: config.id,
            useOptions
        };
    };
}
