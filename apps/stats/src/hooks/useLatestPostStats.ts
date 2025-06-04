import {useQuery} from '@tanstack/react-query';

interface LatestPostStats {
    id: string;
    title: string;
    slug: string;
    feature_image: string | null;
    published_at: string;
    email_count: number | null;
    opened_count: number | null;
    open_rate: number | null;
    member_delta: number;
    free_members: number;
    paid_members: number;
    visitors: number;
}

interface LatestPostStatsResponse {
    stats: LatestPostStats[];
}

export const useLatestPostStats = () => {
    const {data, isLoading, error} = useQuery<LatestPostStatsResponse>({
        queryKey: ['stats', 'latest-post'],
        queryFn: async () => {
            const response = await fetch('/ghost/api/admin/stats/latest-post/');
            if (!response.ok) {
                throw new Error('Failed to fetch latest post stats');
            }
            return response.json();
        }
    });

    return {
        isLoading,
        stats: data?.stats?.[0] || null,
        error: error instanceof Error ? error.message : null
    };
}; 