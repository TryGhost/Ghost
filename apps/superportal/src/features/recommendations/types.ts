export interface Recommendation {
    id: string;
    title: string;
    url: string;
    description?: string | null;
    favicon?: string | null;
    featured_image?: string | null;
    one_click_subscribe?: boolean;
}

export interface RecommendationsResponse {
    recommendations: Recommendation[];
}
