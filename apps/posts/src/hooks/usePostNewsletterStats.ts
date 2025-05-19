import {getPost} from '@tryghost/admin-x-framework/api/posts';
import {useMemo} from 'react';
import {useNewsletterStatsByNewsletterId} from '@tryghost/admin-x-framework/api/stats';
import {useTopLinks} from '@tryghost/admin-x-framework/api/links';

// Extend the Post type to include newsletter property
type PostWithNewsletter = {
    newsletter?: {
        id: string;
    };
    email?: {
        email_count: number;
        opened_count: number;
    };
    count?: {
        clicks: number;
    };
    // Use unknown instead of any for the index signature
    [key: string]: unknown;
};

export const usePostNewsletterStats = (postId: string) => {
    const {data: postResponse, isLoading: isPostLoading} = getPost(postId);

    // Fetch the post to get top level stats
    const post = useMemo(() => postResponse?.posts[0] as PostWithNewsletter | undefined, [postResponse]);
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

    // Get the newsletter_id from the post
    const newsletterId = useMemo(() => post?.newsletter?.id, [post]);

    // Fetch the last 20 newsletters and calculate the average open and click rates
    const {data: newsletterStatsResponse, isLoading: isNewsletterStatsLoading} = useNewsletterStatsByNewsletterId(newsletterId);

    // Get the top 5 link clicks from this post
    const {data: clicksResponse, isLoading: isClicksLoading, refetch: refetchTopLinks} = useTopLinks({
        searchParams: {
            post_id: postId,
            limit: '5',
            filter: 'clicks:>0'
        }
    });

    const links = useMemo(() => {
        return clicksResponse?.links.map(link => ({
            link: link.link,
            count: link.count?.clicks || 0
        })) || [];
    }, [clicksResponse]);

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

        const totalOpenRate = newsletters.reduce((sum, newsletter) => sum + (newsletter.open_rate || 0), 0);
        const totalClickRate = newsletters.reduce((sum, newsletter) => sum + (newsletter.click_rate || 0), 0);

        return {
            openRate: Number((totalOpenRate / newsletters.length).toFixed(2)),
            clickRate: Number((totalClickRate / newsletters.length).toFixed(2))
        };
    }, [newsletterStatsResponse]);

    // Map links to the format expected by tests
    const topLinks = useMemo(() => {
        return links.map(link => ({
            url: link.link?.to || '',
            clicks: link.count || 0,
            edited: link.link?.edited || false
        })) || [];
    }, [links]);

    // Map averages to the format expected by tests
    const averageStats = useMemo(() => {
        return {
            openedRate: averages.openRate,
            clickedRate: averages.clickRate
        };
    }, [averages]);

    return {
        post,
        stats,
        averageStats,
        topLinks,
        refetchTopLinks,
        isLoading: isPostLoading || isNewsletterStatsLoading || isClicksLoading
    };
};