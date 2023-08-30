import {Meta, createQuery} from '../utils/apiRequests';

export type Recommendation = {
    id: string;
    title: string;
    reason: string;
    url: string;
    created_at: string;
    updated_at?: string;
}

export interface RecommendationResponseType {
    meta?: Meta
    recommendations: Recommendation[]
}

const dataType = 'RecommendationResponseType';

export const useBrowseRecommendations = createQuery<RecommendationResponseType>({
    dataType,
    path: '/recommendations/',
    defaultSearchParams: {}
});
