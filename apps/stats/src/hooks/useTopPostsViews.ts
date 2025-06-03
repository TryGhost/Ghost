import {formatQueryDate} from '@tryghost/shade';
import {useQuery} from '@tanstack/react-query';

interface TopPostViewsStats {
    post_id: string;
    title: string;
    published_at: string;
    feature_image: string;
    views: number;
    open_rate: number | null;
    members: number;
}

interface TopPostViewsResponse {
    stats: TopPostViewsStats[][];
}

interface TopPostsViewsOptions {
    startDate?: string;
    endDate?: string;
    limit?: number;
    timezone?: string;
}

/**
 * Hook to fetch top posts by views for a given time range.
 * Posts are filtered by their published_at date and ordered by view count.
 * Data is decorated with open rate and member counts from Ghost.
 */
export const useTopPostsViews = ({startDate, endDate, limit = 5, timezone = 'UTC'}: TopPostsViewsOptions = {}) => {
    return useQuery<TopPostViewsResponse>({
        queryKey: ['stats', 'top-posts-views', startDate, endDate, limit, timezone],
        queryFn: async () => {
            const params = new URLSearchParams();
            
            if (startDate) {
                params.set('date_from', formatQueryDate(startDate));
            }
            if (endDate) {
                params.set('date_to', formatQueryDate(endDate));
            }
            params.set('timezone', timezone);
            params.set('limit', String(limit));

            const response = await fetch(`/ghost/api/admin/stats/top-posts-views/?${params}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch top posts views');
            }
            
            return response.json();
        }
    });
}; 