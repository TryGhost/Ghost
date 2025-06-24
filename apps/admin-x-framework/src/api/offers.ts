import {Meta, createMutation, createQuery, createQueryWithId} from '../utils/api/hooks';
import {updateQueryCache, insertToQueryCache} from '../utils/api/updateQueries';

export type Offer = {
    id: string;
    name: string;
    code: string;
    display_title: string;
    display_description: string;
    type: string;
    cadence: string;
    amount: number;
    duration: string;
    duration_in_months: number | null;
    currency_restriction: boolean;
    currency: string | null;
    status: string;
    redemption_count: number;
    tier: {
        id: string;
        name?: string;
    },
    created_at?: string;
    last_redeemed? : string;
}

export type PartialNewOffer = Omit<Offer, 'redemption_count'>;
export type NewOffer = Partial<Pick<PartialNewOffer, 'id'>> & Omit<PartialNewOffer, 'id'>;

export interface OffersResponseType {
    meta?: Meta
    offers?: Offer[]
}

export interface OfferEditResponseType extends OffersResponseType {
    meta?: Meta
}

export interface OfferAddResponseType {
    meta?: Meta,
    offers: NewOffer[]
}

const dataType = 'OffersResponseType';

export const useBrowseOffers = createQuery<OffersResponseType>({
    dataType,
    path: '/offers/',
    // offers endpoint doesn't support limit or pagination so we exclude the default ?limit=20
    defaultSearchParams: {}
});

export const useBrowseOffersById = createQueryWithId<OffersResponseType>({
    dataType,
    path: id => `/offers/${id}/`
});

export const useEditOffer = createMutation<OfferEditResponseType, Offer>({
    method: 'PUT',
    path: offer => `/offers/${offer.id}/`,
    body: offer => ({offers: [offer]}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: updateQueryCache('offers')
    }
});

export const useAddOffer = createMutation<OfferAddResponseType, NewOffer>({
    method: 'POST',
    path: () => '/offers/',
    body: offer => ({offers: [offer]}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: insertToQueryCache('offers')
    }
});
