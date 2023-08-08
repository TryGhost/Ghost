import {Meta, createMutation, createQuery} from '../utils/apiRequests';

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

export const useBrowseTiers = createQuery<TiersResponseType>({
    dataType,
    path: '/tiers/',
    defaultSearchParams: {
        limit: 'all'
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
        update: (newData, currentData) => ({
            ...(currentData as TiersResponseType),
            tiers: (currentData as TiersResponseType).tiers.map((tier) => {
                const newTier = newData.tiers.find(({id}) => id === tier.id);
                return newTier || tier;
            })
        })
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
