import {getPost} from '@tryghost/admin-x-framework/api/posts';
import {useNewsletterStats} from '@tryghost/admin-x-framework/api/stats';

import { useMemo } from 'react';
export const usePostNewsletterStats = (postId: string) => {
    const {data: postResponse, isLoading: isPostLoading} = getPost(postId);

    const post = useMemo(() => postResponse?.posts[0], [postResponse]);

    const stats = useMemo(() => {
        if (!post) {
            return {
                sent: 0,
                opened: 0,
                clicked: 0,
                openedRate: 0,
                clickedRate: 0
            }
        }

        return {
            sent: post.email?.email_count || 0,
            opened: post.email?.opened_count || 0,
            clicked: post.count?.clicks || 0,
            openedRate: post.email?.opened_count ? (post.email.opened_count / post.email.email_count) : 0,
            clickedRate: post.count?.clicks && post.email?.email_count ? (post.count.clicks / post.email.email_count) : 0
        }
    }, [post]);
    // Fetch all the link clicks for the post

    // Fetch the last 20 newsletters and calculate the average open and click rates
    const {data: newsletterStatsResponse, isLoading: isNewsletterStatsLoading} = useNewsletterStats();

    const averageStats = useMemo(() => {
        if (!newsletterStatsResponse) {
            return {
                openedRate: 0,
                clickedRate: 0
            }
        }

        const newsletterStats = newsletterStatsResponse.stats;

        const averageOpenedRate = newsletterStats.reduce((acc, curr) => acc + curr.open_rate, 0) / newsletterStats.length;
        const averageClickedRate = newsletterStats.reduce((acc, curr) => acc + curr.click_rate, 0) / newsletterStats.length;

        return {
            openedRate: Math.round(averageOpenedRate * 100) / 100,
            clickedRate: Math.round(averageClickedRate * 100) / 100
        }
    }, [newsletterStatsResponse]);

    return {
        isLoading: isPostLoading || isNewsletterStatsLoading,
        post,
        stats,
        averageStats
    };
};