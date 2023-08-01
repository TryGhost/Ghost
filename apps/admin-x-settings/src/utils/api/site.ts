import {SiteData} from '../../types/api';
import {createQuery} from '../apiRequests';

export interface SiteResponseType {
    site: SiteData;
}

const dataType = 'SiteResponseType';

export const useBrowseSite = createQuery<SiteResponseType>({
    dataType,
    path: '/site/'
});
