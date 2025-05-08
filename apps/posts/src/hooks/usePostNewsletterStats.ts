import {getPost} from '@tryghost/admin-x-framework/api/posts';
import {useMemo} from 'react';
import {useNewsletterStats} from '@tryghost/admin-x-framework/api/stats';
import {useTopLinks} from '@tryghost/admin-x-framework/api/links';
export const usePostNewsletterStats = (postId: string) => {
    const {data: postResponse, isLoading: isPostLoading} = getPost(postId);

    // Fetch the post to get top level stats
    const post = useMemo(() => postResponse?.posts[0], [postResponse]);
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

    // Fetch the last 20 newsletters and calculate the average open and click rates
    const {data: newsletterStatsResponse, isLoading: isNewsletterStatsLoading} = useNewsletterStats();

    const averageStats = useMemo(() => {
        if (!newsletterStatsResponse || !newsletterStatsResponse.stats || newsletterStatsResponse.stats.length === 0) {
            return {
                openedRate: 0,
                clickedRate: 0
            };
        }

        const newsletterStats = newsletterStatsResponse.stats;

        const totalOpenedRate = newsletterStats.reduce((acc, curr) => acc + (curr.open_rate || 0), 0);
        const totalClickedRate = newsletterStats.reduce((acc, curr) => acc + (curr.click_rate || 0), 0);

        const averageOpenedRate = totalOpenedRate / newsletterStats.length;
        const averageClickedRate = totalClickedRate / newsletterStats.length;

        return {
            openedRate: Math.round(averageOpenedRate * 100) / 100,
            clickedRate: Math.round(averageClickedRate * 100) / 100
        };
    }, [newsletterStatsResponse]);

    // Fetch the top clicked links for the post
    const {data: topLinksResponse, isLoading: isTopLinksLoading, refetch: refetchTopLinks} = useTopLinks({
        searchParams: {
            filter: `post_id:'${postId}'`
        }
    });

    const topLinks = useMemo(() => {
        if (!topLinksResponse || !topLinksResponse.links || topLinksResponse.links.length === 0) {
            return [];
        }

        return topLinksResponse.links.sort((a, b) => b.count.clicks - a.count.clicks).map(link => ({
            url: link.link.to,
            clicks: link.count.clicks,
            edited: link.link.edited
        }));
    }, [topLinksResponse]);

    return {
        isLoading: isPostLoading || isNewsletterStatsLoading || isTopLinksLoading,
        post,
        stats,
        averageStats,
        topLinks,
        refetchTopLinks
    };
};