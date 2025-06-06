import moment from 'moment';
import {useMemo} from 'react';
import {usePostGrowthStats as usePostGrowthStatsAPI, usePostReferrers as usePostReferrersAPI} from '@tryghost/admin-x-framework/api/stats';

// Source normalization mapping - matches Tinybird's mv_hits.pipe logic
// Using Map for O(1) lookup performance
const SOURCE_MAPPING = new Map<string, string>([
    // Social Media Consolidation
    ['facebook', 'Facebook'],
    ['www.facebook.com', 'Facebook'],
    ['l.facebook.com', 'Facebook'],
    ['lm.facebook.com', 'Facebook'],
    ['m.facebook.com', 'Facebook'],
    ['twitter', 'Twitter'],
    ['x.com', 'Twitter'],
    ['com.twitter.android', 'Twitter'],
    ['go.bsky.app', 'Bluesky'],
    ['bsky', 'Bluesky'],
    ['bsky.app', 'Bluesky'],
    ['linkedin', 'LinkedIn'],
    ['www.linkedin.com', 'LinkedIn'],
    ['linkedin.com', 'LinkedIn'],
    ['instagram', 'Instagram'],
    ['www.instagram.com', 'Instagram'],
    ['instagram.com', 'Instagram'],
    ['youtube', 'YouTube'],
    ['www.youtube.com', 'YouTube'],
    ['youtube.com', 'YouTube'],
    ['m.youtube.com', 'YouTube'],
    ['threads', 'Threads'],
    ['www.threads.net', 'Threads'],
    ['threads.net', 'Threads'],
    ['tiktok', 'TikTok'],
    ['www.tiktok.com', 'TikTok'],
    ['tiktok.com', 'TikTok'],
    ['pinterest', 'Pinterest'],
    ['www.pinterest.com', 'Pinterest'],
    ['pinterest.com', 'Pinterest'],
    ['reddit', 'Reddit'],
    ['www.reddit.com', 'Reddit'],
    ['reddit.com', 'Reddit'],
    ['whatsapp', 'WhatsApp'],
    ['whatsapp.com', 'WhatsApp'],
    ['www.whatsapp.com', 'WhatsApp'],
    ['telegram', 'Telegram'],
    ['telegram.org', 'Telegram'],
    ['www.telegram.org', 'Telegram'],
    ['t.me', 'Telegram'],
    ['news.ycombinator.com', 'Hacker News'],
    ['substack', 'Substack'],
    ['substack.com', 'Substack'],
    ['www.substack.com', 'Substack'],
    ['medium', 'Medium'],
    ['medium.com', 'Medium'],
    ['www.medium.com', 'Medium'],
    
    // Search Engines
    ['google', 'Google'],
    ['www.google.com', 'Google'],
    ['google.com', 'Google'],
    ['bing', 'Bing'],
    ['www.bing.com', 'Bing'],
    ['bing.com', 'Bing'],
    ['yahoo', 'Yahoo'],
    ['www.yahoo.com', 'Yahoo'],
    ['yahoo.com', 'Yahoo'],
    ['search.yahoo.com', 'Yahoo'],
    ['duckduckgo', 'DuckDuckGo'],
    ['duckduckgo.com', 'DuckDuckGo'],
    ['www.duckduckgo.com', 'DuckDuckGo'],
    ['search.brave.com', 'Brave Search'],
    ['yandex', 'Yandex'],
    ['yandex.com', 'Yandex'],
    ['www.yandex.com', 'Yandex'],
    ['baidu', 'Baidu'],
    ['baidu.com', 'Baidu'],
    ['www.baidu.com', 'Baidu'],
    ['ecosia', 'Ecosia'],
    ['www.ecosia.org', 'Ecosia'],
    ['ecosia.org', 'Ecosia'],
    
    // Email Platforms
    ['gmail', 'Gmail'],
    ['mail.google.com', 'Gmail'],
    ['gmail.com', 'Gmail'],
    ['outlook', 'Outlook'],
    ['outlook.live.com', 'Outlook'],
    ['outlook.com', 'Outlook'],
    ['hotmail.com', 'Outlook'],
    ['mail.yahoo.com', 'Yahoo Mail'],
    ['ymail.com', 'Yahoo Mail'],
    ['icloud.com', 'Apple Mail'],
    ['me.com', 'Apple Mail'],
    ['mac.com', 'Apple Mail'],
    
    // News Aggregators
    ['news.google.com', 'Google News'],
    ['apple.news', 'Apple News'],
    ['flipboard', 'Flipboard'],
    ['flipboard.com', 'Flipboard'],
    ['www.flipboard.com', 'Flipboard'],
    ['smartnews', 'SmartNews'],
    ['smartnews.com', 'SmartNews'],
    ['www.smartnews.com', 'SmartNews']
]);

const normalizeSource = (source: string): string => {
    if (!source || source === '') {
        return '';
    }
    
    // Case-insensitive lookup
    const lowerSource = source.toLowerCase();
    return SOURCE_MAPPING.get(lowerSource) || source;
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
