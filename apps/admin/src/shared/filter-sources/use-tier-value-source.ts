import {createLocalValueSource} from './create-local-value-source';
import {getActiveTiers, getArchivedTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useMemo} from 'react';
import type {FilterOption, ValueSource} from '@tryghost/shade/patterns';
import type {Tier} from '@tryghost/admin-x-framework/api/tiers';

interface TierValueSource {
    valueSource: ValueSource<string>;
    // True once more than one paid tier (active or archived) exists, i.e. when
    // filtering members by tier is meaningful. Stays false until tiers load.
    hasMultipleTiers: boolean;
}

function toTierFilterOption(tier: Tier): FilterOption<string> {
    return {
        value: tier.id,
        label: tier.active ? tier.name : `${tier.name} (archived)`,
        detail: tier.slug
    };
}

// Active tiers first, then archived; each group keeps the order returned by the API.
function buildTierFilterOptions(tiers: Tier[]): FilterOption<string>[] {
    return [
        ...getActiveTiers(tiers).map(toTierFilterOption),
        ...getArchivedTiers(tiers).map(toTierFilterOption)
    ];
}

export function useTierValueSource(): TierValueSource {
    // The tiers endpoint returns every match in a single response, so no paging or
    // limit is needed; `type:paid` keeps free/complimentary tiers out of the filter.
    const {data: tiersData, isLoading} = useBrowseTiers({
        searchParams: {filter: 'type:paid'}
    });

    const tiers = useMemo(() => tiersData?.tiers ?? [], [tiersData?.tiers]);
    const options = useMemo(() => buildTierFilterOptions(tiers), [tiers]);
    const hasMultipleTiers = tiers.length > 1;

    const useLocalTierValueSource = createLocalValueSource<FilterOption<string>, string>({
        id: 'posts.tiers.local',
        useItems: () => ({
            data: options,
            isLoading
        }),
        toOption: option => option
    });

    return {
        valueSource: useLocalTierValueSource(),
        hasMultipleTiers
    };
}
