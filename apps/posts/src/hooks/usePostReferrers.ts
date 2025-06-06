import moment from 'moment';
import {useMemo} from 'react';
import {usePostGrowthStats as usePostGrowthStatsAPI, usePostReferrers as usePostReferrersAPI} from '@tryghost/admin-x-framework/api/stats';

// Source normalization mapping - matches Tinybird's mv_hits.pipe logic
const normalizeSource = (source: string): string => {
    if (!source || source === '') {
        return '';
    }
    
    // Social Media Consolidation
    if (['Facebook', 'www.facebook.com', 'l.facebook.com', 'lm.facebook.com', 'm.facebook.com', 'facebook'].includes(source)) {
        return 'Facebook';
    }
    if (['Twitter', 'x.com', 'com.twitter.android'].includes(source)) {
        return 'Twitter';
    }
    if (['go.bsky.app', 'bsky', 'bsky.app'].includes(source)) {
        return 'Bluesky';
    }
    if (['LinkedIn', 'www.linkedin.com', 'linkedin.com'].includes(source)) {
        return 'LinkedIn';
    }
    if (['Instagram', 'www.instagram.com', 'instagram.com'].includes(source)) {
        return 'Instagram';
    }
    if (['YouTube', 'www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(source)) {
        return 'YouTube';
    }
    if (['Threads', 'www.threads.net', 'threads.net'].includes(source)) {
        return 'Threads';
    }
    if (['TikTok', 'www.tiktok.com', 'tiktok.com'].includes(source)) {
        return 'TikTok';
    }
    if (['Pinterest', 'www.pinterest.com', 'pinterest.com'].includes(source)) {
        return 'Pinterest';
    }
    if (['Reddit', 'www.reddit.com', 'reddit.com'].includes(source)) {
        return 'Reddit';
    }
    if (['WhatsApp', 'whatsapp.com', 'www.whatsapp.com'].includes(source)) {
        return 'WhatsApp';
    }
    if (['Telegram', 'telegram.org', 'www.telegram.org', 't.me'].includes(source)) {
        return 'Telegram';
    }
    if (['Hacker News', 'news.ycombinator.com'].includes(source)) {
        return 'Hacker News';
    }
    if (['Substack', 'substack.com', 'www.substack.com'].includes(source)) {
        return 'Substack';
    }
    if (['Medium', 'medium.com', 'www.medium.com'].includes(source)) {
        return 'Medium';
    }
    
    // Search Engines
    if (['Google', 'www.google.com', 'google.com'].includes(source)) {
        return 'Google';
    }
    if (['Bing', 'www.bing.com', 'bing.com'].includes(source)) {
        return 'Bing';
    }
    if (['Yahoo', 'www.yahoo.com', 'yahoo.com', 'search.yahoo.com'].includes(source)) {
        return 'Yahoo';
    }
    if (['DuckDuckGo', 'duckduckgo.com', 'www.duckduckgo.com'].includes(source)) {
        return 'DuckDuckGo';
    }
    if (['Brave Search', 'search.brave.com'].includes(source)) {
        return 'Brave Search';
    }
    if (['Yandex', 'yandex.com', 'www.yandex.com'].includes(source)) {
        return 'Yandex';
    }
    if (['Baidu', 'baidu.com', 'www.baidu.com'].includes(source)) {
        return 'Baidu';
    }
    if (['Ecosia', 'www.ecosia.org', 'ecosia.org'].includes(source)) {
        return 'Ecosia';
    }
    
    // Email Platforms
    if (['Gmail', 'mail.google.com', 'gmail.com'].includes(source)) {
        return 'Gmail';
    }
    if (['Outlook', 'outlook.live.com', 'outlook.com', 'hotmail.com'].includes(source)) {
        return 'Outlook';
    }
    if (['Yahoo Mail', 'mail.yahoo.com', 'ymail.com'].includes(source)) {
        return 'Yahoo Mail';
    }
    if (['Apple Mail', 'icloud.com', 'me.com', 'mac.com'].includes(source)) {
        return 'Apple Mail';
    }
    
    // News Aggregators
    if (['Google News', 'news.google.com'].includes(source)) {
        return 'Google News';
    }
    if (['Apple News', 'apple.news'].includes(source)) {
        return 'Apple News';
    }
    if (['Flipboard', 'flipboard.com', 'www.flipboard.com'].includes(source)) {
        return 'Flipboard';
    }
    if (['SmartNews', 'smartnews.com', 'www.smartnews.com'].includes(source)) {
        return 'SmartNews';
    }
    
    // If no match found, return original source
    return source;
};

// Helper function to convert range to date parameters
export const getRangeDates = (rangeInDays: number) => {
    // Always use UTC to stay aligned with the backend's date arithmetic
    const endDate = moment.utc().format('YYYY-MM-DD');
    let dateFrom;

    if (rangeInDays === 1) {
        // Today
        dateFrom = endDate;
    } else if (rangeInDays === 1000) {
        // All time - use a far past date
        dateFrom = '2010-01-01';
    } else {
        // Specific range
        // Guard against invalid ranges
        const safeRange = Math.max(1, rangeInDays);
        dateFrom = moment.utc().subtract(safeRange - 1, 'days').format('YYYY-MM-DD');
    }

    return {dateFrom, endDate};
};

export const usePostReferrers = (postId: string) => {
    const {data: postReferrerResponse, isLoading: isPostReferrersLoading} = usePostReferrersAPI(postId);
    // API doesn't support date_from yet, so we fetch all data and filter on the client for now
    const {data: postGrowthStatsResponse, isLoading: isPostGrowthStatsLoading} = usePostGrowthStatsAPI(postId);

    const stats = useMemo(() => {
        const rawStats = postReferrerResponse?.stats || [];
        // Apply source normalization to match Tinybird data
        return rawStats.map(stat => ({
            ...stat,
            source: normalizeSource(stat.source || '')
        }));
    }, [postReferrerResponse]);
    const totals = useMemo(() => {
        if (postGrowthStatsResponse?.stats.length === 0) {
            return {
                free_members: 0,
                paid_members: 0,
                mrr: 0
            };
        } else {
            return postGrowthStatsResponse?.stats[0];
        }
    }, [postGrowthStatsResponse]);

    const isLoading = useMemo(() => isPostReferrersLoading || isPostGrowthStatsLoading, [isPostReferrersLoading, isPostGrowthStatsLoading]);

    return {
        isLoading,
        stats,
        totals
    };
};
