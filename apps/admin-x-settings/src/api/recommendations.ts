import {Meta, createQuery} from '../utils/apiRequests';

export type Recommendation = {
    id: string
    title: string
    reason: string|null
    excerpt: string|null // Fetched from the site meta data
    featured_image: string|null // Fetched from the site meta data
    favicon: string|null // Fetched from the site meta data
    url: string
    one_click_subscribe: boolean
    created_at: string,
    updated_at: string|null
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
