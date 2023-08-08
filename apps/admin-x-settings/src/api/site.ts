import {SiteData} from '../types/api';
import {createQuery} from '../utils/apiRequests';

export interface SiteResponseType {
    site: SiteData;
}

const dataType = 'SiteResponseType';

export const useBrowseSite = createQuery<SiteResponseType>({
    dataType,
    path: '/site/'
});
