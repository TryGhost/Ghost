import { Meta, createMutation, createQuery } from '../apiRequests';
import { Tier } from '../../types/api';

export interface TiersResponseType {
    meta?: Meta
    tiers: Tier[]
}

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
