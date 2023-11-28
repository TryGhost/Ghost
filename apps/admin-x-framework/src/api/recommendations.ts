import {InfiniteData} from '@tanstack/react-query';
import {Meta, createInfiniteQuery, createMutation} from '../utils/api/hooks';

export type Recommendation = {
    id: string
    title: string
    description: string|null
    excerpt: string|null // Fetched from the site meta data
    featured_image: string|null // Fetched from the site meta data
    favicon: string|null // Fetched from the site meta data
    url: string
    one_click_subscribe: boolean
    created_at: string,
    updated_at: string|null,
    count?: {subscribers?: number, clicks?: number}
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

export const useBrowseRecommendations = createInfiniteQuery<RecommendationResponseType>({
    dataType,
    path: '/recommendations/',
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<RecommendationResponseType>;
        let recommendations = pages.flatMap(page => page.recommendations);

        // Remove duplicates
        recommendations = recommendations.filter((recommendation, index) => {
            return recommendations.findIndex(({id}) => id === recommendation.id) === index;
        });

        return {
            recommendations,
            meta: pages[pages.length - 1].meta
        };
    }
});

export const useDeleteRecommendation = createMutation<RecommendationDeleteResponseType, Recommendation>({
    method: 'DELETE',
    path: recommendation => `/recommendations/${recommendation.id}/`,

    invalidateQueries: {
        dataType
    }
});

export const useEditRecommendation = createMutation<RecommendationEditResponseType, Partial<Recommendation> & {id: string}>({
    method: 'PUT',
    path: recommendation => `/recommendations/${recommendation.id}/`,
    body: recommendation => ({recommendations: [recommendation]}),

    invalidateQueries: {
        dataType
    }
});

export const useAddRecommendation = createMutation<RecommendationResponseType, Partial<Recommendation>>({
    method: 'POST',
    path: () => '/recommendations/',
    body: ({...recommendation}) => ({recommendations: [recommendation]}),

    invalidateQueries: {
        dataType
    }
});

export const useCheckRecommendation = createMutation<RecommendationResponseType, URL>({
    method: 'POST',
    path: () => '/recommendations/check/',
    body: url => ({recommendations: [{url: url.toString()}]})
});

export type IncomingRecommendation = {
    id: string
    title: string
    url: string
    excerpt: string|null
    featured_image: string|null
    favicon: string|null
    recommending_back: boolean
}

export interface IncomingRecommendationResponseType {
    meta?: Meta
    recommendations: IncomingRecommendation[]
}

export const useBrowseIncomingRecommendations = createInfiniteQuery<IncomingRecommendationResponseType>({
    dataType,
    path: '/incoming_recommendations/',
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<IncomingRecommendationResponseType>;
        let recommendations = pages.flatMap(page => page.recommendations);

        // Remove duplicates
        recommendations = recommendations.filter((mention, index) => {
            return recommendations.findIndex(({id}) => id === mention.id) === index;
        });

        return {
            recommendations,
            meta: pages[pages.length - 1].meta
        };
    }
});
