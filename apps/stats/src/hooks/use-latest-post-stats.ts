import {Post, useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useMemo} from 'react';
import {usePostStats} from '@tryghost/admin-x-framework/api/stats';

// Extended Post interface that includes authors and excerpt
interface ExtendedPost extends Post {
    authors?: {
        name: string;
    }[];
    excerpt?: string;
    count?: {
        clicks?: number;
    };
}

export interface LatestPostWithStats {
    id: string;
    uuid: string;
    title: string;
    slug: string;
    feature_image?: string | null;
    published_at: string;
    url?: string;
    excerpt?: string;
    email_only?: boolean;
    status?: string;
    email?: {
        opened_count: number;
        email_count: number;
        status?: string;
    } | null;
    count?: {
        clicks?: number;
    } | null;
    authors?: {
        name: string;
    }[];
    // Analytics data
    recipient_count: number | null;
    opened_count: number | null;
    open_rate: number | null;
    member_delta: number;
    free_members: number;
    paid_members: number;
    visitors: number;
    click_rate?: number | null;
}

export const useLatestPostStats = () => {
    // Fetch the latest published post
    const {data: {posts: [latestPost]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: 'status:[published,sent]',
            order: 'published_at DESC',
            limit: '1',
            include: 'authors,email,count.clicks'
        }
    });

    // Cast to ExtendedPost to access authors and excerpt
    const extendedPost = latestPost as ExtendedPost | undefined;

    // Only fetch stats if we have a valid post ID
    const postStatsResult = usePostStats(extendedPost?.id || '', {
        enabled: Boolean(extendedPost?.id)
    });

    const {data: postStatsData, isLoading: isStatsLoading} = postStatsResult;

    // Combine the data
    const latestPostWithStats = useMemo((): LatestPostWithStats | null => {
        if (!extendedPost) {
            return null;
        }

        // If we have a post but no stats, return the post with default stats
        const statsData = postStatsData?.stats?.[0] || {
            id: extendedPost.id,
            recipient_count: null,
            opened_count: null,
            open_rate: null,
            member_delta: 0,
            free_members: 0,
            paid_members: 0,
            visitors: 0
        };

        return {
            // Post content from Posts API
            id: extendedPost.id,
            uuid: extendedPost.uuid,
            title: extendedPost.title || '',
            slug: extendedPost.slug || '',
            feature_image: extendedPost.feature_image || null,
            published_at: extendedPost.published_at || '',
            url: extendedPost.url || '',
            excerpt: extendedPost.excerpt || '',
            email_only: extendedPost.email_only || false,
            status: extendedPost.status,
            email: extendedPost.email,
            count: extendedPost.count,
            authors: extendedPost.authors || [],
            // Analytics data from Stats API
            recipient_count: statsData.recipient_count,
            opened_count: statsData.opened_count,
            open_rate: statsData.open_rate,
            member_delta: statsData.member_delta,
            free_members: statsData.free_members,
            paid_members: statsData.paid_members,
            visitors: statsData.visitors,
            click_rate: null // TODO: Add click_rate to PostStats interface if needed
        };
    }, [extendedPost, postStatsData]);

    return {
        data: latestPostWithStats,
        isLoading: isPostLoading || (Boolean(extendedPost?.id) && isStatsLoading)
    };
}; 