import {createLocalValueSource} from './create-local-value-source';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useEffect, useMemo} from 'react';
import type {FilterOption, ValueSource} from '@tryghost/shade/patterns';
import type {Tier} from '@tryghost/admin-x-framework/api/tiers';

const TIER_FILTER_PAGE_LIMIT = '100';
const TIER_FILTER_TYPE = 'type:paid';
const ARCHIVED_TIER_LABEL_SUFFIX = ' (archived)';
const EMPTY_TIERS: Tier[] = [];

type TierValueSource = ValueSource<string> & {
    hasMultipleTiers: boolean;
};

function toTierFilterOption(tier: Tier): FilterOption<string> {
    return {
        value: tier.id,
        label: tier.active ? tier.name : `${tier.name}${ARCHIVED_TIER_LABEL_SUFFIX}`,
        detail: tier.slug
    };
}

function buildTierFilterOptions(tiers: Tier[] = []): FilterOption<string>[] {
    const activeTiers = tiers.filter(tier => tier.active);
    const archivedTiers = tiers.filter(tier => !tier.active);

    return [
        ...activeTiers.map(toTierFilterOption),
        ...archivedTiers.map(toTierFilterOption)
    ];
}

export function useTierValueSource(): TierValueSource {
    const {
        data: tiersData,
        fetchNextPage,
        isFetchingNextPage,
        isLoading
    } = useBrowseTiers({searchParams: {filter: TIER_FILTER_TYPE, limit: TIER_FILTER_PAGE_LIMIT}});

    useEffect(() => {
        if (tiersData?.isEnd === false && !isFetchingNextPage) {
            void fetchNextPage();
        }
    }, [fetchNextPage, isFetchingNextPage, tiersData?.isEnd]);

    const tiers = tiersData?.tiers ?? EMPTY_TIERS;
    const isLoadingTierOptions = isLoading || isFetchingNextPage || tiersData?.isEnd === false;
    const options = useMemo(() => buildTierFilterOptions(tiers), [tiers]);
    const hasMultipleTiers = tiers.length > 1 || tiersData?.isEnd === false;

    const useLocalTierValueSource = createLocalValueSource<FilterOption<string>, string>({
        id: 'posts.tiers.local',
        useItems: () => ({
            data: isLoadingTierOptions ? undefined : options,
            isLoading: isLoadingTierOptions
        }),
        toOption: option => option
    });

    return {
        ...useLocalTierValueSource(),
        hasMultipleTiers
    };
}
