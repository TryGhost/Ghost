import {type CleanedLink, cleanTrackedUrl} from '@src/utils/link-helpers';
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

export const usePostNewsletterStats = (postId: string, linksLimit?: string) => {
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

    // Get link clicks from this post, with optional limit
    const searchParams: Record<string, string> = {
        filter: `post_id:'${postId}'`
    };
    
    if (linksLimit) {
        searchParams.limit = linksLimit;
    }
    
    const {data: clicksResponse, isLoading: isClicksLoading, refetch: refetchTopLinks} = useTopLinks({
        searchParams
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

    const topLinks = useMemo(() => {
        const cleanedLinks = links.map((link) => {
            return {
                ...link,
                link: {
                    ...link.link,
                    originalTo: link.link.to,
                    to: cleanTrackedUrl(link.link.to, false),
                    title: cleanTrackedUrl(link.link.to, true)
                }
            };
        });

        const linksByTitle = cleanedLinks.reduce((acc: Record<string, CleanedLink>, link: CleanedLink) => {
            if (!acc[link.link.title]) {
                acc[link.link.title] = link;
            } else {
                if (!acc[link.link.title].count) {
                    acc[link.link.title].count = 0;
                }
                acc[link.link.title].count += (link.count ?? 0);
            }
            return acc;
        }, {});

        return Object.values(linksByTitle).sort((a, b) => {
            const aClicks = a.count || 0;
            const bClicks = b.count || 0;
            return bClicks - aClicks;
        });
    }, [links]);

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