// Source domain mapping for favicons
export const SOURCE_DOMAIN_MAP: Record<string, string> = {
    Reddit: 'reddit.com',
    'www.reddit.com': 'reddit.com',
    Facebook: 'facebook.com',
    Twitter: 'twitter.com',
    Bluesky: 'bsky.app',
    'go.bsky.app': 'bsky.app',
    Instagram: 'instagram.com',
    LinkedIn: 'linkedin.com',
    Threads: 'threads.net',
    'Brave Search': 'search.brave.com',
    Ecosia: 'ecosia.org',
    Gmail: 'gmail.com',
    Outlook: 'outlook.com',
    'Yahoo!': 'yahoo.com',
    'AOL Mail': 'aol.com',
    Flipboard: 'flipboard.com',
    Substack: 'substack.com',
    Ghost: 'ghost.org',
    'Ghost Explore': 'ghost.org',
    Buffer: 'buffer.com',
    Taboola: 'taboola.com',
    AppNexus: 'appnexus.com',
    Wikipedia: 'wikipedia.org',
    Mastodon: 'mastodon.social',
    Memeorandum: 'memeorandum.com',
    'Ground News': 'ground.news',
    'Apple News': 'apple.com',
    SmartNews: 'smartnews.com',
    'Hacker News': 'news.ycombinator.com',
    // Search engines
    Google: 'google.com',
    'Google News': 'news.google.com',
    Bing: 'bing.com',
    DuckDuckGo: 'duckduckgo.com',
    // Email/Newsletter
    'newsletter-email': 'static.ghost.org',
    newsletter: 'static.ghost.org'
};

// Comprehensive source normalization mapping
export const SOURCE_NORMALIZATION_MAP = new Map<string, string>([
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

/**
 * Normalize source names to consistent display names
 * @param source - Raw source string from referrer data
 * @returns Normalized source name or 'Direct' for empty/null sources
 */
export function normalizeSource(source: string | null): string {
    if (!source || source === '') {
        return 'Direct';
    }

    // Case-insensitive lookup
    const lowerSource = source.toLowerCase();
    return SOURCE_NORMALIZATION_MAP.get(lowerSource) || source;
}

// Helper function to extract domain from URL
export const extractDomain = (url: string): string | null => {
    try {
        const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        return domain.replace(/^www\./, '');
    } catch {
        return null;
    }
};

export interface ExtendSourcesOptions {
    processedData: ProcessedSourceData[];
    totalVisitors: number;
    mode: 'visits' | 'growth';
}

export function extendSourcesWithPercentages({
    processedData,
    totalVisitors,
    mode
}: ExtendSourcesOptions): ProcessedSourceData[] {
    if (mode === 'growth') {
        return processedData;
    }

    return processedData.map(item => ({
        ...item,
        percentage: totalVisitors > 0 ? (item.visits / totalVisitors) : 0
    }));
};

// Helper function to check if a domain is the same or a subdomain
export const isDomainOrSubdomain = (sourceDomain: string, siteDomain: string): boolean => {
    // Exact match
    if (sourceDomain === siteDomain) {
        return true;
    }

    // Subdomain check: source should end with ".siteDomain"
    return sourceDomain.endsWith(`.${siteDomain}`);
};

// Helper function to get favicon domain and determine if it's direct traffic
export const getFaviconDomain = (source: string | number | undefined, siteUrl?: string): {domain: string | null, isDirectTraffic: boolean} => {
    if (!source || typeof source !== 'string') {
        return {domain: null, isDirectTraffic: false};
    }
    
    // Handle 'Direct' source explicitly
    if (source === 'Direct') {
        return {domain: null, isDirectTraffic: true};
    }

    // Extract site domain for comparison
    const siteDomain = siteUrl ? extractDomain(siteUrl) : null;

    // Check if source matches site domain or is a subdomain (treat as direct traffic)
    if (siteDomain) {
        const sourceDomain = extractDomain(source);
        if (sourceDomain && isDomainOrSubdomain(sourceDomain, siteDomain)) {
            return {domain: siteDomain, isDirectTraffic: true};
        }

        // Also check the source string directly (in case it's already just a domain)
        if (isDomainOrSubdomain(source, siteDomain)) {
            return {domain: siteDomain, isDirectTraffic: true};
        }
    }

    // First check our mapping for known sources
    const mappedDomain = SOURCE_DOMAIN_MAP[source];
    if (mappedDomain) {
        return {domain: mappedDomain, isDirectTraffic: false};
    }

    // If not in mapping, check if it's already a domain
    const isDomain = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(source);
    if (isDomain) {
        // Clean up the domain by removing www. prefix
        const cleanDomain = source.replace(/^www\./, '');
        return {domain: cleanDomain, isDirectTraffic: false};
    }

    // No domain found
    return {domain: null, isDirectTraffic: false};
};

// Base interface for all source data types
export interface BaseSourceData {
    source?: string | number;
    visits?: number;
    free_members?: number;
    paid_members?: number;
    mrr?: number;
    [key: string]: unknown;
}

// Processed source data with pre-computed display values
export interface ProcessedSourceData {
    source: string;
    visits: number;
    isDirectTraffic: boolean;
    iconSrc: string;
    displayName: string;
    linkUrl?: string;
    percentage?: number;
    // Additional fields for growth data
    free_members?: number;
    paid_members?: number;
    mrr?: number;
}

export interface ProcessSourcesOptions {
    data: BaseSourceData[] | null;
    mode: 'visits' | 'growth';
    siteUrl?: string;
    siteIcon?: string;
    defaultSourceIconUrl: string;
}

export function processSources({
    data,
    mode,
    siteUrl,
    siteIcon,
    defaultSourceIconUrl
}: ProcessSourcesOptions): ProcessedSourceData[] {
    if (!data) {
        return [];
    }

    const sourceMap = new Map<string, ProcessedSourceData>();
    let directTrafficTotal = mode === 'visits' ? 0 : undefined;
    const directTrafficData = mode === 'growth' ? {
        free_members: 0,
        paid_members: 0,
        mrr: 0
    } : undefined;

    // Process each source and group direct traffic
    data.forEach((item) => {
        const {domain: faviconDomain, isDirectTraffic} = getFaviconDomain(item.source, siteUrl);
        const visits = Number(item.visits || 0);

        if (isDirectTraffic || !item.source || item.source === '') {
            // Accumulate all direct traffic
            if (mode === 'visits') {
                directTrafficTotal! += visits;
            } else if (mode === 'growth' && directTrafficData) {
                directTrafficData.free_members += item.free_members || 0;
                directTrafficData.paid_members += item.paid_members || 0;
                directTrafficData.mrr += item.mrr || 0;
            }
        } else {
            // Keep other sources as-is
            const sourceKey = String(item.source);
            const iconSrc = faviconDomain
                ? `https://www.faviconextractor.com/favicon/${faviconDomain}?larger=true`
                : defaultSourceIconUrl;
            const linkUrl = faviconDomain ? `https://${faviconDomain}` : undefined;

            if (sourceMap.has(sourceKey)) {
                const existing = sourceMap.get(sourceKey)!;
                existing.visits += visits;
                if (mode === 'growth') {
                    existing.free_members = (existing.free_members || 0) + (item.free_members || 0);
                    existing.paid_members = (existing.paid_members || 0) + (item.paid_members || 0);
                    existing.mrr = (existing.mrr || 0) + (item.mrr || 0);
                }
            } else {
                const processedItem: ProcessedSourceData = {
                    source: sourceKey,
                    visits,
                    isDirectTraffic: false,
                    iconSrc,
                    displayName: sourceKey,
                    linkUrl
                };

                if (mode === 'growth') {
                    processedItem.free_members = item.free_members || 0;
                    processedItem.paid_members = item.paid_members || 0;
                    processedItem.mrr = item.mrr || 0;
                }

                sourceMap.set(sourceKey, processedItem);
            }
        }
    });

    // Add consolidated direct traffic entry if there's any
    const hasDirectTraffic = mode === 'visits'
        ? directTrafficTotal! > 0
        : directTrafficData && (directTrafficData.free_members > 0 || directTrafficData.paid_members > 0 || directTrafficData.mrr > 0);

    if (hasDirectTraffic) {
        const directEntry: ProcessedSourceData = {
            source: 'Direct',
            visits: mode === 'visits' ? directTrafficTotal! : 0,
            isDirectTraffic: true,
            iconSrc: siteIcon || defaultSourceIconUrl,
            displayName: 'Direct',
            linkUrl: undefined
        };

        if (mode === 'growth' && directTrafficData) {
            directEntry.free_members = directTrafficData.free_members;
            directEntry.paid_members = directTrafficData.paid_members;
            directEntry.mrr = directTrafficData.mrr;
        }

        sourceMap.set('Direct', directEntry);
    }

    // Convert back to array and sort
    const result = Array.from(sourceMap.values());

    if (mode === 'growth') {
        // Sort by total impact (prioritizing MRR, then paid members, then free members)
        return result.sort((a, b) => {
            const aScore = (a.mrr || 0) * 100 + (a.paid_members || 0) * 10 + (a.free_members || 0);
            const bScore = (b.mrr || 0) * 100 + (b.paid_members || 0) * 10 + (b.free_members || 0);
            return bScore - aScore;
        });
    } else {
        // Sort by visits
        return result.sort((a, b) => b.visits - a.visits);
    }
}

