import {Meta, createMutation, createQuery} from '../utils/apiRequests';

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

export type EditOrAddRecommendation = Omit<Recommendation, 'id'|'created_at'|'updated_at'> & {id?: string};

export interface RecommendationResponseType {
    meta?: Meta
    recommendations: Recommendation[]
}

export interface RecommendationEditResponseType extends RecommendationResponseType {
}

export interface RecommendationDeleteResponseType {}

const dataType = 'RecommendationResponseType';

export const useBrowseRecommendations = createQuery<RecommendationResponseType>({
    dataType,
    path: '/recommendations/',
    defaultSearchParams: {}
});

export const useDeleteRecommendation = createMutation<RecommendationDeleteResponseType, Recommendation>({
    method: 'DELETE',
    path: recommendation => `/recommendations/${recommendation.id}/`,
    updateQueries: {
        dataType,
        update: (_: RecommendationDeleteResponseType, currentData, payload) => (currentData && {
            ...(currentData as RecommendationResponseType),
            recommendations: (currentData as RecommendationResponseType).recommendations.filter((r) => {
                return r.id !== payload.id;
            })
        })
    }
});

export const useEditRecommendation = createMutation<RecommendationEditResponseType, Recommendation>({
    method: 'PUT',
    path: recommendation => `/recommendations/${recommendation.id}/`,
    body: recommendation => ({recommendations: [recommendation]}),
    updateQueries: {
        dataType,
        update: (newData, currentData) => (currentData && {
            ...(currentData as RecommendationResponseType),
            recommendations: (currentData as RecommendationResponseType).recommendations.map((recommendation) => {
                const newRecommendation = newData.recommendations.find(({id}) => id === recommendation.id);
                return newRecommendation || recommendation;
            })
        })
    }
});

export const useAddRecommendation = createMutation<RecommendationResponseType, Partial<Recommendation>>({
    method: 'POST',
    path: () => '/recommendations/',
    body: ({...recommendation}) => ({recommendations: [recommendation]}),
    updateQueries: {
        dataType,
        update: (newData, currentData) => (currentData && {
            ...(currentData as RecommendationResponseType),
            recommendations: (currentData as RecommendationResponseType).recommendations.concat(newData.recommendations)
        })
    }
});
