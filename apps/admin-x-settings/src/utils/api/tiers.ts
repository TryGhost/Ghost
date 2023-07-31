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
    invalidateQueries: {dataType}
});

export const useEditTier = createMutation<TiersResponseType, Tier>({
    method: 'PUT',
    path: () => '/tiers/:id/',
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
