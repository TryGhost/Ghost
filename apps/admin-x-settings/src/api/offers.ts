import {Meta, createQuery} from '../utils/api/hooks';

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
        name: string;
    }
}

export interface OffersResponseType {
    meta?: Meta
    offers: Offer[]
}

const dataType = 'OffersResponseType';

export const useBrowseOffers = createQuery<OffersResponseType>({
    dataType,
    path: '/offers/'
});
