import {InfiniteData} from '@tanstack/react-query';
import {Meta, createInfiniteQuery, createMutation} from '../utils/api/hooks';
import {updateQueryCache} from '../utils/api/updateQueries';

// Types

export type Tier = {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    active: boolean,
    type: string;
    welcome_page_url: string | null;
    created_at: string;
    updated_at: string;
    visibility: string;
    benefits: string[];
    currency?: string;
    monthly_price?: number;
    yearly_price?: number;
    trial_days: number;
}

export interface TiersResponseType {
    meta?: Meta
    tiers: Tier[]
}

// Requests

const dataType = 'TiersResponseType';

export const useBrowseTiers = createInfiniteQuery<TiersResponseType & {isEnd: boolean}>({
    dataType,
    path: '/tiers/',
    defaultNextPageParams: (lastPage, otherParams) => ({
        ...otherParams,
        page: (lastPage.meta?.pagination.next || 1).toString()
    }),
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<TiersResponseType>;
        const tiers = pages.flatMap(page => page.tiers);
        const meta = pages[pages.length - 1].meta;

        return {
            tiers,
            meta,
            isEnd: meta ? meta.pagination.pages === meta.pagination.page : true
        };
    }
});

export const useAddTier = createMutation<TiersResponseType, Partial<Tier>>({
    method: 'POST',
    path: () => '/tiers/',
    body: tier => ({tiers: [tier]}),
    // We may have queries for paid/archived/etc, so we can't assume how to update the global store and need to reload queries from the server
    invalidateQueries: {dataType}
});

export const useEditTier = createMutation<TiersResponseType, Tier>({
    method: 'PUT',
    path: tier => `/tiers/${tier.id}/`,
    body: tier => ({tiers: [tier]}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: updateQueryCache('tiers')
    }
});

// Helpers

export function getPaidActiveTiers(tiers: Tier[]) {
    return tiers.filter((tier) => {
        return tier.type === 'paid' && tier.active;
    });
}

export function getActiveTiers(tiers: Tier[]) {
    return tiers.filter((tier) => {
        return tier.active;
    });
}

export function getArchivedTiers(tiers: Tier[]) {
    return tiers.filter((tier) => {
        return !tier.active;
    });
}
