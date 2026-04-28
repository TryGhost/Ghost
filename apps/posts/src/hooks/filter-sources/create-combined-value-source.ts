import {FilterOption, ValueSource, ValueSourceParams, ValueSourceState} from '@tryghost/shade/patterns';
import {ValueSourceHook, ValueSourceHookOptions} from './create-remote-value-source';
import {mergeFilterOptions} from './utils';
import {useCallback, useMemo} from 'react';

export function createCombinedValueSource<T = string>(
    useFirstSource: ValueSourceHook<T>,
    useSecondSource: ValueSourceHook<T>,
    getMissingSelectedOption?: (selectedValue: T) => FilterOption<T>
): ValueSourceHook<T> {
    return function useCombinedValueSource(options?: ValueSourceHookOptions): ValueSource<T> {
        const firstSource = useFirstSource(options);
        const secondSource = useSecondSource(options);

        const useOptions = useCallback(({query, selectedValues}: ValueSourceParams<T>): ValueSourceState<T> => {
            const firstState = firstSource.useOptions({query, selectedValues});
            const secondState = secondSource.useOptions({query, selectedValues});
            // Withhold the second source's options until the first has no more pages.
            // Both sources fetch their first page eagerly, but rendering the second
            // source's options while the first can still grow would push freshly
            // loaded first-source pages in above options already in view - revealing
            // the (pre-fetched) second source only once the first is exhausted keeps
            // every load appending below the fold.
            const visibleSecondOptions = firstState.hasMore ? [] : secondState.options;
            const mergedOptions = mergeFilterOptions(firstState.options, visibleSecondOptions);
            const fallbackOptions = getMissingSelectedOption ? selectedValues.flatMap((selectedValue) => {
                const hasMatch = mergedOptions.some(option => option.value === selectedValue);

                if (hasMatch) {
                    return [];
                }

                return [getMissingSelectedOption(selectedValue)];
            }) : [];

            return {
                options: mergeFilterOptions(mergedOptions, fallbackOptions),
                isInitialLoad: firstState.options.length === 0 &&
                    secondState.options.length === 0 &&
                    (firstState.isInitialLoad || secondState.isInitialLoad),
                isSearching: firstState.isSearching || secondState.isSearching,
                isLoadingMore: firstState.isLoadingMore || secondState.isLoadingMore,
                hasMore: firstState.hasMore || secondState.hasMore,
                loadMore: () => {
                    // Paginate one source at a time, matching the render order above:
                    // advance the first until it runs out, then the second.
                    if (firstState.hasMore) {
                        firstState.loadMore();
                        return;
                    }

                    if (secondState.hasMore) {
                        secondState.loadMore();
                    }
                }
            };
        }, [firstSource, secondSource]);

        return useMemo(() => ({
            id: `${firstSource.id}+${secondSource.id}`,
            useOptions
        }), [firstSource.id, secondSource.id, useOptions]);
    };
}
