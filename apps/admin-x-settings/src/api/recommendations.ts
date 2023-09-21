import {Meta, apiUrl, createMutation, createPaginatedQuery, useFetchApi} from '../utils/apiRequests';

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

export const useBrowseRecommendations = createPaginatedQuery<RecommendationResponseType>({
    dataType,
    path: '/recommendations/',
    defaultSearchParams: {}
});

export const useDeleteRecommendation = createMutation<RecommendationDeleteResponseType, Recommendation>({
    method: 'DELETE',
    path: recommendation => `/recommendations/${recommendation.id}/`,
    // Clear all queries because pagination needs to be re-checked
    invalidateQueries: {
        dataType
    }
});

export const useEditRecommendation = createMutation<RecommendationEditResponseType, Partial<Recommendation> & {id: string}>({
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

    // Clear all queries because pagination needs to be re-checked
    invalidateQueries: {
        dataType
    }
});

export const useGetRecommendationByUrl = () => {
    const fetchApi = useFetchApi();
    const path = '/recommendations/';

    return {
        async query(url: URL): Promise<RecommendationResponseType | null> {
            const urlFilter = `url:~'${url.host.replace('www.', '')}${url.pathname.replace(/\/$/, '')}'`;
            const endpoint = apiUrl(path, {filter: urlFilter, limit: '1'});
            try {
                const result = await fetchApi(endpoint, {
                    method: 'GET',
                    timeout: 5000
                });
                return result as RecommendationResponseType;
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error(e);
                return null;
            }
        }
    };
};
