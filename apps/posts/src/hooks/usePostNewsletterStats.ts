import {type NewsletterStatItem, useNewsletterBasicStats, useNewsletterClickStats} from '@tryghost/admin-x-framework/api/stats';
import {type Post, getPost} from '@tryghost/admin-x-framework/api/posts';
import {processAndGroupTopLinks} from '@src/utils/link-helpers';
import {useMemo} from 'react';
import {useTopLinks} from '@tryghost/admin-x-framework/api/links';

// Extend the Post type to include newsletter property
type PostWithNewsletter = Post & {
    newsletter?: {
        id: string;
    };
};

export const usePostNewsletterStats = (postId: string) => {
    // Fetch the post with main stats (email, clicks)
    const {data: postResponse, isLoading: isPostLoading} = getPost(postId);

    // Fetch the post with feedback count relations
    const {data: feedbackPostResponse, isLoading: isFeedbackPostLoading} = getPost(postId, {
        searchParams: {
            include: 'count.positive_feedback,count.negative_feedback'
        }
    });

    // Fetch the post to get top level stats
    const post = useMemo(() => postResponse?.posts[0] as PostWithNewsletter | undefined, [postResponse]);
    const feedbackPost = useMemo(() => feedbackPostResponse?.posts[0] as PostWithNewsletter | undefined, [feedbackPostResponse]);

    const stats = useMemo(() => {
        if (!post) {
            return {
                sent: 0,
                opened: 0,
                clicked: 0,
                openedRate: 0,
                clickedRate: 0
            };
        }

        return {
            sent: post.email?.email_count || 0,
            opened: post.email?.opened_count || 0,
            clicked: post.count?.clicks || 0,
            openedRate: post.email?.opened_count ? (post.email.opened_count / post.email.email_count) : 0,
            clickedRate: post.count?.clicks && post.email?.email_count ? (post.count.clicks / post.email.email_count) : 0
        };
    }, [post]);

    // Calculate feedback stats from the separate feedback post fetch
    const feedbackStats = useMemo(() => {
        if (!feedbackPost?.count) {
            return {
                positiveFeedback: 0,
                negativeFeedback: 0,
                totalFeedback: 0
            };
        }

        const positiveFeedback = feedbackPost.count.positive_feedback || 0;
        const negativeFeedback = feedbackPost.count.negative_feedback || 0;
        const totalFeedback = positiveFeedback + negativeFeedback;

        return {
            positiveFeedback,
            negativeFeedback,
            totalFeedback
        };
    }, [feedbackPost]);

    // Get the newsletter_id from the post
    const newsletterId = useMemo(() => post?.newsletter?.id, [post]);

    // Fetch the last 20 newsletters using split approach for better performance
    // 1. Basic stats (fast) - includes open rates
    const {data: basicStatsResponse, isLoading: isBasicStatsLoading} = useNewsletterBasicStats({
        searchParams: newsletterId ? {newsletter_id: newsletterId} : {},
        enabled: !!newsletterId
    });

    // Get post IDs from basic stats to fetch click data
    const postIds = useMemo(() => {
        if (!basicStatsResponse?.stats) {
            return [];
        }
        return basicStatsResponse.stats.map(stat => stat.post_id);
    }, [basicStatsResponse]);

    // 2. Click stats (potentially slower) - fetch separately
    const {data: clickStatsResponse, isLoading: isClickStatsLoading} = useNewsletterClickStats({
        searchParams: newsletterId && postIds.length > 0 ? {
            newsletter_id: newsletterId,
            post_ids: postIds.join(',')
        } : {},
        enabled: !!newsletterId && postIds.length > 0
    });

    // Merge basic stats with click stats
    const newsletterStatsResponse = useMemo(() => {
        if (!basicStatsResponse?.stats) {
            return undefined;
        }

        const basicStats = basicStatsResponse.stats;
        const clickStats = clickStatsResponse?.stats || [];

        // Create a map of click data by post_id for fast lookup
        const clickStatsMap = new Map();
        clickStats.forEach((clickStat) => {
            clickStatsMap.set(clickStat.post_id, clickStat);
        });

        // Merge basic stats with click stats
        const mergedStats = basicStats.map((basicStat) => {
            const clickData = clickStatsMap.get(basicStat.post_id);
            return {
                ...basicStat,
                total_clicks: clickData?.total_clicks || 0,
                click_rate: clickData?.click_rate || 0
            };
        });

        return {
            ...basicStatsResponse,
            stats: mergedStats
        };
    }, [basicStatsResponse, clickStatsResponse]);

    const isNewsletterStatsLoading = isBasicStatsLoading || isClickStatsLoading;

    // Get the top links from this post
    const {data: clicksResponse, isLoading: isClicksLoading, refetch: refetchTopLinks} = useTopLinks({
        searchParams: {
            filter: `post_id:'${postId}'`
        }
    });

    // Calculate average open and click rates across newsletters
    const averages = useMemo(() => {
        if (!newsletterStatsResponse || !newsletterStatsResponse.stats) {
            return {
                openRate: 0,
                clickRate: 0
            };
        }

        const newsletters = newsletterStatsResponse.stats;
        if (newsletters.length === 0) {
            return {
                openRate: 0,
                clickRate: 0
            };
        }

        const totalOpenRate = newsletters.reduce((sum: number, newsletter: NewsletterStatItem) => sum + (newsletter.open_rate || 0), 0);
        const totalClickRate = newsletters.reduce((sum: number, newsletter: NewsletterStatItem) => sum + (newsletter.click_rate || 0), 0);

        return {
            openRate: Number((totalOpenRate / newsletters.length).toFixed(2)),
            clickRate: Number((totalClickRate / newsletters.length).toFixed(2))
        };
    }, [newsletterStatsResponse]);

    const topLinks = useMemo(() => {
        return processAndGroupTopLinks(clicksResponse);
    }, [clicksResponse]);

    const averageStats = useMemo(() => {
        return {
            openedRate: averages.openRate,
            clickedRate: averages.clickRate
        };
    }, [averages]);

    return {
        post,
        stats,
        feedbackStats,
        averageStats,
        topLinks,
        refetchTopLinks,
        isLoading: isPostLoading || isFeedbackPostLoading || isNewsletterStatsLoading || isClicksLoading
    };
};
