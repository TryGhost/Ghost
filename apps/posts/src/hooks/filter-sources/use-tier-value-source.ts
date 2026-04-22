import {FilterOption, ValueSource} from '@tryghost/shade/patterns';
import {createLocalValueSource} from './create-local-value-source';

export function useTierValueSource(options: FilterOption<string>[] = []): ValueSource<string> {
    const useLocalTierValueSource = createLocalValueSource<FilterOption<string>, string>({
        id: 'posts.tiers.local',
        useItems: () => ({
            data: options,
            isLoading: false
        }),
        toOption: option => option
    });

    return useLocalTierValueSource();
}
