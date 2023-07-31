import {Meta, createQuery} from '../apiRequests';
import {Offer} from '../../types/api';

export interface OffersResponseType {
    meta?: Meta
    offers: Offer[]
}

const dataType = 'OffersResponseType';

export const useBrowseOffers = createQuery<OffersResponseType>({
    dataType,
    path: '/offers/',
    defaultSearchParams: {limit: 'all'}
});
