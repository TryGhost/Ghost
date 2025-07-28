/**
 * Simple in-memory cache for fake data to ensure consistency during a session
 */
interface CacheEntry {
    data: unknown;
    timestamp: number;
}

class FakeDataCache {
    private cache = new Map<string, CacheEntry>();
    private readonly TTL = 30 * 60 * 1000; // 30 minutes TTL

    get(key: string): unknown | undefined {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }

        // Check if entry has expired
        if (Date.now() - entry.timestamp > this.TTL) {
            this.cache.delete(key);
            return undefined;
        }

        return entry.data;
    }

    set(key: string, data: unknown): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clear(): void {
        this.cache.clear();
    }
}

// Global cache instance
const fakeDataCache = new FakeDataCache();

/**
 * Master analytics data model to ensure all metrics are consistent
 */
interface MasterAnalyticsModel {
    totalVisits: number;
    totalPageviews: number;
    totalMembers: number;
    totalMrr: number;
    postViews: Array<{postIndex: number; views: number; members: number}>;
    dailyVisits: Array<{date: string; visits: number; pageviews: number}>;
    locationBreakdown: Array<{location: string; visits: number}>;
    sourceBreakdown: Array<{source: string; visits: number; members: number}>;
    initialized: boolean;
}

// Global analytics model
let masterAnalytics: MasterAnalyticsModel = {
    totalVisits: 0,
    totalPageviews: 0,
    totalMembers: 0,
    totalMrr: 0,
    postViews: [],
    dailyVisits: [],
    locationBreakdown: [],
    sourceBreakdown: [],
    initialized: false
};

/**
 * Initialize the master analytics model with consistent data
 */
function initializeMasterAnalytics(): void {
    if (masterAnalytics.initialized) {
        return;
    }

    // Generate realistic total metrics
    const totalVisits = 800 + Math.floor(Math.random() * 400); // 800-1200 total visits
    const totalPageviews = Math.floor(totalVisits * (1.8 + Math.random() * 0.7)); // 1.8-2.5 pages per visit
    const totalMembers = Math.floor(totalVisits * (0.08 + Math.random() * 0.12)); // 8-20% conversion rate
    const totalMrr = Math.floor(totalMembers * 0.3 * (15 + Math.random() * 20)); // 30% paid, $15-35/month

    // Distribute visits across 10 top posts (following Pareto principle)
    const postViews = [];
    let remainingViews = Math.floor(totalVisits * 0.7); // 70% of traffic goes to top posts
    
    for (let i = 0; i < 10; i++) {
        // Use power law distribution - first post gets more, then decreasing
        const share = Math.pow(0.7, i) * (0.8 + Math.random() * 0.4);
        const views = Math.floor(remainingViews * share / (i + 1));
        const members = Math.floor(views * (0.05 + Math.random() * 0.15));
        
        postViews.push({postIndex: i, views, members});
        remainingViews = Math.max(0, remainingViews - views);
    }

    // Generate daily breakdown (31 days)
    const dailyVisits = [];
    let distributedVisits = 0;
    
    for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Distribute total visits across days with some variation
        const dailyShare = (1 / 31) + (Math.random() - 0.5) * 0.02; // ±1% variation
        const visits = Math.floor(totalVisits * dailyShare);
        const pageviews = Math.floor(visits * (1.8 + Math.random() * 0.7));
        
        dailyVisits.push({
            date: date.toISOString().split('T')[0],
            visits,
            pageviews
        });
        
        distributedVisits += visits;
    }

    // Adjust last day to match total exactly
    if (dailyVisits.length > 0) {
        const difference = totalVisits - distributedVisits;
        dailyVisits[dailyVisits.length - 1].visits += difference;
    }

    // Generate location breakdown that adds up to total
    const locations = ['United States', 'United Kingdom', 'Canada', 'Germany', 'Australia', 'France', 'Netherlands', 'India'];
    const locationBreakdown = [];
    let remainingLocationVisits = totalVisits;
    
    for (let i = 0; i < locations.length - 1; i++) {
        const share = Math.pow(0.6, i) * (0.5 + Math.random() * 0.3);
        const visits = Math.min(Math.floor(remainingLocationVisits * share), remainingLocationVisits);
        locationBreakdown.push({location: locations[i], visits});
        remainingLocationVisits -= visits;
    }
    
    // Last location gets remaining visits
    if (remainingLocationVisits > 0) {
        locationBreakdown.push({location: locations[locations.length - 1], visits: remainingLocationVisits});
    }

    // Generate source breakdown that adds up to total
    const sources = [
        {source: 'Direct', baseShare: 0.35},
        {source: 'Google', baseShare: 0.25},
        {source: 'Twitter', baseShare: 0.15},
        {source: 'LinkedIn', baseShare: 0.12},
        {source: 'Facebook', baseShare: 0.08},
        {source: 'Reddit', baseShare: 0.05}
    ];
    
    const sourceBreakdown = [];
    let remainingSourceVisits = totalVisits;
    
    for (let i = 0; i < sources.length - 1; i++) {
        const share = sources[i].baseShare * (0.8 + Math.random() * 0.4);
        const visits = Math.min(Math.floor(totalVisits * share), remainingSourceVisits);
        const members = Math.floor(visits * (0.05 + Math.random() * 0.15));
        
        sourceBreakdown.push({
            source: sources[i].source,
            visits,
            members
        });
        remainingSourceVisits -= visits;
    }
    
    // Last source gets remaining visits
    if (remainingSourceVisits > 0) {
        const members = Math.floor(remainingSourceVisits * (0.05 + Math.random() * 0.15));
        sourceBreakdown.push({
            source: sources[sources.length - 1].source,
            visits: remainingSourceVisits,
            members
        });
    }

    // Update master analytics
    masterAnalytics = {
        totalVisits,
        totalPageviews,
        totalMembers,
        totalMrr,
        postViews,
        dailyVisits,
        locationBreakdown,
        sourceBreakdown,
        initialized: true
    };
}

/**
 * Wrapper function to add caching to fake data generators
 */
function withCache<T>(key: string, generator: () => T): T {
    const cached = fakeDataCache.get(key) as T;
    if (cached !== undefined) {
        return cached;
    }

    const data = generator();
    fakeDataCache.set(key, data);
    return data;
}

/**
 * Async wrapper function to add caching to async fake data generators
 */
async function withAsyncCache<T>(key: string, generator: () => Promise<T>): Promise<T> {
    const cached = fakeDataCache.get(key) as T;
    if (cached !== undefined) {
        return cached;
    }

    const data = await generator();
    fakeDataCache.set(key, data);
    return data;
}

/**
 * Enhanced cache wrapper for dynamic endpoints with parameters
 */
function withDynamicCache<T>(baseKey: string, params: string, generator: () => T): T {
    const key = `${baseKey}:${params}`;
    return withCache(key, generator);
}

/**
 * Clear the fake data cache (useful for testing or forcing refresh)
 * Usage in browser console: window.clearFakeDataCache()
 */
export function clearFakeDataCache(): void {
    fakeDataCache.clear();
    // Reset master analytics so it gets regenerated with new random values
    masterAnalytics.initialized = false;
}

/**
 * Get cache stats for debugging
 */
export function getFakeDataCacheStats(): {size: number; keys: string[]} {
    const cache = (fakeDataCache as any).cache;
    return {
        size: cache.size,
        keys: Array.from(cache.keys())
    };
}

/**
 * Test function to verify real post fetching works
 * Usage in browser console: window.testRealPostFetching()
 */
export async function testRealPostFetching(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('Testing real post fetching...');
    try {
        const posts = await fetchRealPosts(5);
        // eslint-disable-next-line no-console
        console.log('Fetched posts:', posts);
        // eslint-disable-next-line no-console
        console.log(`Successfully fetched ${posts.length} posts`);
        
        if (posts.length > 0) {
            // eslint-disable-next-line no-console
            console.log('Sample post:', {
                id: posts[0].id,
                title: posts[0].title,
                slug: posts[0].slug,
                hasFeatureImage: !!posts[0].feature_image
            });
        }
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to test real post fetching:', error);
    }
}

/**
 * Show master analytics data for debugging
 * Usage in browser console: window.showMasterAnalytics()
 */
export function showMasterAnalytics(): void {
    initializeMasterAnalytics();
    // eslint-disable-next-line no-console
    console.log('Master Analytics Data:', {
        totalVisits: masterAnalytics.totalVisits,
        totalPageviews: masterAnalytics.totalPageviews,
        totalMembers: masterAnalytics.totalMembers,
        topPostViews: masterAnalytics.postViews.slice(0, 5),
        topSources: masterAnalytics.sourceBreakdown.slice(0, 3),
        topLocations: masterAnalytics.locationBreakdown.slice(0, 3),
        dailyVisitsSum: masterAnalytics.dailyVisits.reduce((sum, day) => sum + day.visits, 0)
    });
}

/**
 * Generates fake member count history data with realistic growth patterns
 */
function generateMemberCountHistory() {
    const stats = [];
    const now = new Date();
    let paid = 85 + Math.floor(Math.random() * 20); // Start between 85-105
    let free = 450 + Math.floor(Math.random() * 100); // Start between 450-550
    let comped = 5 + Math.floor(Math.random() * 5); // Start between 5-10
    
    // Generate 30 days of data
    for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Simulate realistic growth with some randomness
        const paidGrowth = Math.floor(Math.random() * 4); // 0-3 new paid members per day
        const freeGrowth = Math.floor(Math.random() * 15) + 5; // 5-20 new free members per day
        const compedGrowth = Math.random() < 0.3 ? 1 : 0; // 30% chance of 1 comped member
        
        paid += paidGrowth;
        free += freeGrowth;
        comped += compedGrowth;
        
        stats.push({
            date: date.toISOString().split('T')[0],
            paid,
            free,
            comped,
            paid_subscribed: paidGrowth,
            paid_canceled: Math.random() < 0.1 ? 1 : 0 // 10% chance of cancellation
        });
    }
    
    return {
        stats,
        meta: {
            totals: {
                paid,
                free,
                comped
            }
        }
    };
}

/**
 * Generates fake MRR history data with realistic revenue growth
 */
function generateMrrHistory() {
    const stats = [];
    const now = new Date();
    let mrr = 2500 + Math.floor(Math.random() * 1000); // Start between $2500-$3500
    
    // Generate 30 days of data
    for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Simulate MRR growth with some volatility
        const growth = Math.floor(Math.random() * 100) - 10; // -10 to +90 change
        mrr = Math.max(1000, mrr + growth); // Don't go below $1000
        
        stats.push({
            date: date.toISOString().split('T')[0],
            mrr,
            currency: 'USD'
        });
    }
    
    return {
        stats,
        meta: {
            totals: {
                mrr
            }
        }
    };
}

/**
 * Generates fake active visitors data for Tinybird
 */
function generateActiveVisitors() {
    const activeVisitors = 15 + Math.floor(Math.random() * 85); // 15-100 active visitors
    return {
        data: [{
            active_visitors: activeVisitors
        }]
    };
}

/**
 * Generates fake top pages data for Tinybird
 */
function generateTopPages() {
    const pages = [
        {pathname: '/', hits: 450 + Math.floor(Math.random() * 200)},
        {pathname: '/about', hits: 180 + Math.floor(Math.random() * 100)},
        {pathname: '/pricing', hits: 120 + Math.floor(Math.random() * 80)},
        {pathname: '/blog', hits: 200 + Math.floor(Math.random() * 150)},
        {pathname: '/contact', hits: 90 + Math.floor(Math.random() * 60)},
        {pathname: '/features', hits: 160 + Math.floor(Math.random() * 90)},
        {pathname: '/docs', hits: 110 + Math.floor(Math.random() * 70)}
    ];
    
    // Sort by hits and take top 5
    pages.sort((a, b) => b.hits - a.hits);
    
    return {
        data: pages.slice(0, 5)
    };
}

/**
 * Generates fake top sources data for Tinybird matching BaseSourceData interface
 * Uses master analytics model to ensure consistency
 */
function generateTopSources() {
    // Initialize master analytics if not already done
    initializeMasterAnalytics();
    
    // Use the pre-calculated source breakdown from master analytics
    const data = masterAnalytics.sourceBreakdown.map(source => ({
        source: source.source,
        visits: source.visits,
        free_members: Math.floor(source.members * 0.7), // 70% free
        paid_members: Math.floor(source.members * 0.3), // 30% paid
        mrr: Math.floor(source.members * 0.3 * (15 + Math.random() * 20)) // Paid members * $15-35
    }));
    
    // Sort by visits
    data.sort((a, b) => b.visits - a.visits);
    
    return {
        data
    };
}

/**
 * Generates fake KPIs data for Tinybird with proper field names and multiple dates
 * Uses master analytics model to ensure consistency
 */
function generateKpis() {
    // Initialize master analytics if not already done
    initializeMasterAnalytics();
    
    // Use the pre-calculated daily visits from master analytics
    const data = masterAnalytics.dailyVisits.map(day => ({
        date: day.date,
        visits: day.visits,
        pageviews: day.pageviews,
        bounce_rate: Number((0.35 + Math.random() * 0.3).toFixed(2)), // 35-65% bounce rate
        avg_session_sec: Number((120 + Math.random() * 240).toFixed(2)) // 2-6 minutes average session
    }));
    
    return {
        meta: [
            {name: 'date', type: 'Date'},
            {name: 'visits', type: 'UInt64'},
            {name: 'pageviews', type: 'UInt64'},
            {name: 'bounce_rate', type: 'Float64'},
            {name: 'avg_session_sec', type: 'Float64'}
        ],
        data,
        rows: data.length,
        statistics: {
            elapsed: 0.02 + Math.random() * 0.01,
            rows_read: Math.floor(Math.random() * 50000) + 10000,
            bytes_read: Math.floor(Math.random() * 3000000) + 1000000
        }
    };
}

/**
 * Generates fake top locations data for Tinybird
 * Uses master analytics model to ensure consistency
 */
function generateTopLocations() {
    // Initialize master analytics if not already done
    initializeMasterAnalytics();
    
    // Use the pre-calculated location breakdown from master analytics
    const data = masterAnalytics.locationBreakdown
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 8); // Take top 8 locations
    
    return {
        data
    };
}

/**
 * Generates fake post referrers data for Ghost Admin API
 */
function generatePostReferrers() {
    const stats = [
        {
            source: 'Direct',
            referrer_url: null,
            free_members: 25 + Math.floor(Math.random() * 15),
            paid_members: 8 + Math.floor(Math.random() * 7),
            mrr: (15 + Math.floor(Math.random() * 20)) * 100 // in cents
        },
        {
            source: 'Google',
            referrer_url: 'https://www.google.com/',
            free_members: 18 + Math.floor(Math.random() * 12),
            paid_members: 5 + Math.floor(Math.random() * 5),
            mrr: (10 + Math.floor(Math.random() * 15)) * 100
        },
        {
            source: 'Twitter',
            referrer_url: 'https://twitter.com/',
            free_members: 12 + Math.floor(Math.random() * 8),
            paid_members: 3 + Math.floor(Math.random() * 3),
            mrr: (5 + Math.floor(Math.random() * 10)) * 100
        },
        {
            source: 'Facebook',
            referrer_url: 'https://www.facebook.com/',
            free_members: 8 + Math.floor(Math.random() * 6),
            paid_members: 2 + Math.floor(Math.random() * 2),
            mrr: (3 + Math.floor(Math.random() * 7)) * 100
        },
        {
            source: 'LinkedIn',
            referrer_url: 'https://www.linkedin.com/',
            free_members: 6 + Math.floor(Math.random() * 4),
            paid_members: 1 + Math.floor(Math.random() * 2),
            mrr: (2 + Math.floor(Math.random() * 5)) * 100
        }
    ];
    
    return {
        stats,
        meta: {}
    };
}

/**
 * Generates fake post growth data for Ghost Admin API
 */
function generatePostGrowth() {
    const stats = [{
        post_id: 'fake-post-id',
        free_members: 45 + Math.floor(Math.random() * 25),
        paid_members: 12 + Math.floor(Math.random() * 8),
        mrr: (25 + Math.floor(Math.random() * 35)) * 100 // in cents
    }];
    
    return {
        stats,
        meta: {}
    };
}

/**
 * Generates fake post stats data for individual post analytics
 */
function generatePostStats(postId = '687ff029d5bb294d5cca2116') {
    // Initialize master analytics if not already done
    initializeMasterAnalytics();
    
    // Use the first post's analytics from master data
    const postAnalytics = masterAnalytics.postViews[0] || {views: 50 + Math.floor(Math.random() * 100), members: 5 + Math.floor(Math.random() * 10)};
    
    // Match the expected Ghost API response structure
    const result = {
        stats: [{
            id: postId,
            recipient_count: Math.random() > 0.3 ? 600 + Math.floor(Math.random() * 300) : null, // 70% were sent as newsletters
            opened_count: Math.random() > 0.3 ? Math.floor((600 + Math.floor(Math.random() * 300)) * (0.25 + Math.random() * 0.35)) : null,
            open_rate: Math.random() > 0.3 ? Number((0.25 + Math.random() * 0.35).toFixed(3)) : null,
            member_delta: postAnalytics.members,
            free_members: Math.floor(postAnalytics.members * 0.7),
            paid_members: Math.floor(postAnalytics.members * 0.3),
            visitors: postAnalytics.views
        }]
    };
    
    // eslint-disable-next-line no-console
    console.log('Generated post stats data:', result);
    
    return result;
}

/**
 * Generates fake newsletter basic stats for Ghost Admin API using real posts
 */
async function generateNewsletterBasicStats() {
    // Fetch real posts that were sent as newsletters
    const realPosts = await fetchRealPosts(5);
    
    const stats = [];
    const now = new Date();
    
    // Generate newsletter stats for real posts
    for (let i = 0; i < realPosts.length; i++) {
        const post = realPosts[i];
        const sendDate = new Date(now);
        sendDate.setDate(sendDate.getDate() - (i * 7 + Math.floor(Math.random() * 3))); // Weekly-ish sends
        
        const sentTo = 800 + Math.floor(Math.random() * 400);
        const openRate = 0.25 + Math.random() * 0.35; // 25-60% open rate
        const totalOpens = Math.floor(sentTo * openRate);
        
        stats.push({
            post_id: post.id,
            post_title: post.title,
            send_date: sendDate.toISOString(),
            sent_to: sentTo,
            total_opens: totalOpens,
            open_rate: Number(openRate.toFixed(3)),
            total_clicks: Math.floor(totalOpens * (0.1 + Math.random() * 0.2)), // 10-30% of opens click
            click_rate: Number((0.02 + Math.random() * 0.08).toFixed(3)) // 2-10% overall click rate
        });
    }
    
    return {
        stats,
        meta: {}
    };
}

/**
 * Generates fake newsletter click stats for Ghost Admin API using real posts
 */
async function generateNewsletterClickStats() {
    // Fetch real posts that were sent as newsletters
    const realPosts = await fetchRealPosts(5);
    
    const stats = [];
    const now = new Date();
    
    // Generate newsletter click stats for real posts
    for (let i = 0; i < realPosts.length; i++) {
        const post = realPosts[i];
        const sendDate = new Date(now);
        sendDate.setDate(sendDate.getDate() - (i * 7 + Math.floor(Math.random() * 3)));
        
        const sentTo = 800 + Math.floor(Math.random() * 400);
        const clickRate = 0.02 + Math.random() * 0.08; // 2-10% click rate
        const totalClicks = Math.floor(sentTo * clickRate);
        
        stats.push({
            post_id: post.id,
            post_title: post.title,
            send_date: sendDate.toISOString(),
            sent_to: sentTo,
            total_opens: Math.floor(sentTo * (0.25 + Math.random() * 0.35)),
            open_rate: Number((0.25 + Math.random() * 0.35).toFixed(3)),
            total_clicks: totalClicks,
            click_rate: Number(clickRate.toFixed(3))
        });
    }
    
    return {
        stats,
        meta: {}
    };
}

/**
 * Generates fake newsletter stats (main endpoint) using real posts with fake analytics
 */
async function generateNewsletterStats() {
    // Fetch real posts that were sent as newsletters
    const realPosts = await fetchRealPosts(10);
    
    const stats = [];
    const now = new Date();
    
    // Generate newsletter stats for real posts
    for (let i = 0; i < Math.min(5, realPosts.length); i++) {
        const post = realPosts[i];
        const sendDate = new Date(now);
        sendDate.setDate(sendDate.getDate() - (i * 7 + Math.floor(Math.random() * 3)));
        
        const sentTo = 800 + Math.floor(Math.random() * 400);
        const openRate = 0.25 + Math.random() * 0.35; // 25-60% open rate
        const clickRate = 0.02 + Math.random() * 0.08; // 2-10% click rate
        const totalOpens = Math.floor(sentTo * openRate);
        const totalClicks = Math.floor(sentTo * clickRate);
        
        stats.push({
            post_id: post.id,
            post_title: post.title,
            send_date: sendDate.toISOString(),
            sent_to: sentTo,
            delivered_count: Math.floor(sentTo * 0.98), // 98% delivery rate
            failed_count: Math.floor(sentTo * 0.02), // 2% failure rate
            total_opens: totalOpens,
            unique_opens: Math.floor(totalOpens * 0.8), // 80% unique opens
            open_rate: Number(openRate.toFixed(3)),
            total_clicks: totalClicks,
            unique_clicks: Math.floor(totalClicks * 0.9), // 90% unique clicks
            click_rate: Number(clickRate.toFixed(3)),
            unsubscribed_count: Math.floor(Math.random() * 5), // 0-5 unsubscribes
            complained_count: Math.floor(Math.random() * 2), // 0-1 complaints
            feature_image: post.feature_image || `https://images.unsplash.com/photo-${1500000000 + i}?w=800&h=600`,
            slug: post.slug,
            status: 'published'
        });
    }
    
    return {
        stats,
        meta: {}
    };
}

/**
 * Generates fake subscriber count history data
 */
function generateSubscriberCount() {
    const stats = [];
    const now = new Date();
    let totalSubscribers = 800 + Math.floor(Math.random() * 400); // Start between 800-1200
    let paidSubscribers = Math.floor(totalSubscribers * 0.15); // 15% paid
    let freeSubscribers = totalSubscribers - paidSubscribers;
    
    // Generate 30 days of subscriber data
    for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Simulate realistic growth with some churn
        const newSubs = Math.floor(Math.random() * 20) + 5; // 5-25 new subscribers per day
        const churn = Math.floor(Math.random() * 8); // 0-8 unsubscribes per day
        const netGrowth = newSubs - churn;
        
        totalSubscribers = Math.max(100, totalSubscribers + netGrowth); // Don't go below 100
        
        // Some free subscribers convert to paid
        const conversions = Math.random() < 0.3 ? Math.floor(Math.random() * 3) : 0;
        paidSubscribers = Math.min(Math.floor(totalSubscribers * 0.2), paidSubscribers + conversions);
        freeSubscribers = totalSubscribers - paidSubscribers;
        
        stats.push({
            date: date.toISOString().split('T')[0],
            total: totalSubscribers,
            paid: paidSubscribers,
            free: freeSubscribers,
            subscribed: newSubs,
            unsubscribed: churn
        });
    }
    
    return {
        stats,
        meta: {
            totals: {
                total: totalSubscribers,
                paid: paidSubscribers,
                free: freeSubscribers
            }
        }
    };
}

/**
 * Fetches real posts from Ghost API for more authentic fake data
 */
async function fetchRealPosts(limit = 10): Promise<Record<string, unknown>[]> {
    try {
        // Try to fetch real posts from the Ghost API
        const response = await fetch(`/ghost/api/admin/posts/?limit=${limit}&fields=id,uuid,slug,title,published_at,feature_image,status&include=authors`, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const posts = data.posts || [];
            
            // Filter out any posts without titles (just in case)
            return posts.filter((post: Record<string, unknown>) => post.title && String(post.title).trim().length > 0);
        } else {
            // eslint-disable-next-line no-console
            console.warn('Ghost API returned non-OK status:', response.status, response.statusText);
        }
    } catch (error) {
        // Fall back to fake posts if API fails
        // eslint-disable-next-line no-console
        console.warn('Failed to fetch real posts, using fake data:', error);
    }
    
    // Fallback fake posts if API is not available
    return Array.from({length: limit}, (_, i) => ({
        id: `fallback-post-${i + 1}`,
        uuid: `fallback-uuid-${i + 1}`,
        slug: `amazing-blog-post-title-${i + 1}`,
        title: `Amazing Blog Post Title ${i + 1}`,
        published_at: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000).toISOString(),
        feature_image: `https://images.unsplash.com/photo-${1500000000 + i}?w=800&h=600`,
        status: 'published',
        authors: i % 3 === 0 ? [{name: 'John Doe'}, {name: 'Jane Smith'}] : [{name: 'John Doe'}]
    }));
}

/**
 * Generates fake top posts views data using real post data with fake analytics
 * Uses master analytics model to ensure consistency
 */
async function generateTopPostsViews() {
    // Initialize master analytics if not already done
    initializeMasterAnalytics();
    
    // Fetch real posts from the API
    const realPosts = await fetchRealPosts(10);
    
    const stats = realPosts.map((post, i) => {
        // Use pre-calculated post views from master analytics
        const postAnalytics = masterAnalytics.postViews[i] || {views: 10, members: 1}; // Fallback for extra posts
        const views = postAnalytics.views;
        const members = postAnalytics.members;
        
        // Newsletter stats (realistic but not tied to overall totals)
        const sentCount = Math.random() > 0.3 ? 600 + Math.floor(Math.random() * 300) : null; // 70% were sent as newsletters
        const openedCount = sentCount ? Math.floor(sentCount * (0.25 + Math.random() * 0.35)) : null;
        
        // Format authors - handle both array and string formats
        let authorsString = 'John Doe';
        if (post.authors && Array.isArray(post.authors)) {
            authorsString = post.authors.map((author: Record<string, unknown>) => author.name).join(', ');
        } else if (typeof post.authors === 'string') {
            authorsString = post.authors;
        }
        
        return {
            post_id: post.id,
            title: post.title,
            published_at: post.published_at,
            feature_image: post.feature_image || `https://images.unsplash.com/photo-${1500000000 + i}?w=800&h=600`,
            status: post.status || 'published',
            authors: authorsString,
            views,
            sent_count: sentCount,
            opened_count: openedCount,
            open_rate: openedCount && sentCount ? Number((openedCount / sentCount).toFixed(3)) : null,
            clicked_count: openedCount ? Math.floor(openedCount * (0.1 + Math.random() * 0.2)) : 0,
            click_rate: openedCount && sentCount ? Number((Math.floor(openedCount * (0.1 + Math.random() * 0.2)) / sentCount).toFixed(3)) : null,
            members,
            free_members: Math.floor(members * 0.7),
            paid_members: Math.floor(members * 0.3)
        };
    });
    
    return {
        stats
    };
}

/**
 * Generates fake top content data using real post data with fake analytics
 * Uses master analytics model to ensure consistency
 */
async function generateTopContent() {
    // Initialize master analytics if not already done
    initializeMasterAnalytics();
    
    // Fetch real posts for more authentic content
    const realPosts = await fetchRealPosts(15);
    
    const stats = realPosts.map((post, i) => {
        // Use consistent analytics - distribute remaining visits (30% of total not in top posts)
        const remainingVisits = Math.floor(masterAnalytics.totalVisits * 0.3);
        const visits = Math.floor(remainingVisits / 15) + Math.floor(Math.random() * 10); // Even distribution with some variation
        
        // Create a realistic pathname from the post slug or title
        let pathname = '/';
        if (post.slug) {
            pathname = `/${String(post.slug)}/`;
        } else if (post.title) {
            pathname = `/${String(post.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}/`;
        } else {
            pathname = `/post-${i + 1}/`;
        }
        
        return {
            pathname,
            visits,
            title: post.title,
            post_uuid: post.uuid || post.id,
            post_id: post.id,
            post_type: 'post',
            url_exists: true
        };
    });
    
    return {
        stats,
        meta: {}
    };
}

/**
 * Generates fake top posts data for Growth tab using real posts with fake analytics
 * Uses master analytics model to ensure consistency
 */
async function generateTopPosts() {
    // Initialize master analytics if not already done
    initializeMasterAnalytics();
    
    // Fetch real posts for more authentic content
    const realPosts = await fetchRealPosts(10);
    
    const stats = realPosts.map((post, i) => {
        // Use pre-calculated post views from master analytics
        const postAnalytics = masterAnalytics.postViews[i] || {views: 10 + Math.floor(Math.random() * 50), members: 1 + Math.floor(Math.random() * 5)};
        
        return {
            post_id: post.id,
            post_uuid: post.uuid || post.id,
            title: post.title,
            slug: post.slug,
            published_at: post.published_at,
            feature_image: post.feature_image || `https://images.unsplash.com/photo-${1500000000 + i}?w=800&h=600`,
            status: post.status || 'published',
            conversions: postAnalytics.members, // Members gained from this post
            free_members: Math.floor(postAnalytics.members * 0.7),
            paid_members: Math.floor(postAnalytics.members * 0.3),
            visits: postAnalytics.views,
            views: postAnalytics.views,
            conversion_rate: postAnalytics.views > 0 ? Number((postAnalytics.members / postAnalytics.views * 100).toFixed(1)) : 0
        };
    });
    
    // Sort by conversions (members gained) descending
    stats.sort((a, b) => b.conversions - a.conversions);
    
    return {
        stats,
        meta: {}
    };
}

/**
 * Fake data fixture generators for development and demo purposes
 * All generators are wrapped with caching to ensure consistent data during a session
 */
export const fakeDataFixtures = {
    memberCountHistory: () => withCache('memberCountHistory', generateMemberCountHistory),
    mrrHistory: () => withCache('mrrHistory', generateMrrHistory),
    // Tinybird endpoints
    activeVisitors: () => withCache('activeVisitors', generateActiveVisitors),
    topPages: () => withCache('topPages', generateTopPages),
    topSources: () => withCache('topSources', generateTopSources),
    topLocations: () => withCache('topLocations', generateTopLocations),
    kpis: () => withCache('kpis', generateKpis),
    // Ghost Admin API endpoints
    postReferrers: () => withCache('postReferrers', generatePostReferrers),
    postGrowth: () => withCache('postGrowth', generatePostGrowth),
    postStats: () => withCache('postStats', generatePostStats),
    newsletterBasicStats: () => withAsyncCache('newsletterBasicStats', generateNewsletterBasicStats),
    newsletterClickStats: () => withAsyncCache('newsletterClickStats', generateNewsletterClickStats),
    newsletterStats: () => withAsyncCache('newsletterStats', generateNewsletterStats),
    subscriberCount: () => withCache('subscriberCount', generateSubscriberCount),
    topPostsViews: () => withAsyncCache('topPostsViews', generateTopPostsViews),
    topContent: () => withAsyncCache('topContent', generateTopContent),
    topPosts: () => withAsyncCache('topPosts', generateTopPosts),
    postsWithAnalytics: () => withAsyncCache('postsWithAnalytics', () => generatePostsWithFakeAnalytics())
};

/**
 * Generates fake posts data with enhanced analytics (clicks, members, etc.)
 */
async function generatePostsWithFakeAnalytics(limit = 10): Promise<unknown> {
    // Fetch real posts from the API
    const realPosts = await fetchRealPosts(limit);
    
    // Enhance each post with fake analytics data
    const enhancedPosts = realPosts.map((post, i) => {
        // Use master analytics for consistent data
        initializeMasterAnalytics();
        const postAnalytics = masterAnalytics.postViews[i] || {views: 10 + Math.floor(Math.random() * 50), members: 1 + Math.floor(Math.random() * 5)};
        
        // eslint-disable-next-line no-console
        console.log(`Generating fake analytics for post ${i}:`, {
            postTitle: post.title,
            views: postAnalytics.views,
            members: postAnalytics.members
        });
        
        return {
            ...post,
            // Add fake click analytics
            count: {
                clicks: Math.floor(postAnalytics.views * (0.05 + Math.random() * 0.15)), // 5-20% of views result in clicks
                members: postAnalytics.members,
                paid_conversions: Math.floor(postAnalytics.members * 0.3), // 30% paid conversion
                signups: postAnalytics.members,
                visitors: postAnalytics.views, // Add visitors field for UI
                views: postAnalytics.views // Add views field as alternative
            },
            // Add newsletter analytics if it was sent
            email: Math.random() > 0.3 ? {
                sent_count: 600 + Math.floor(Math.random() * 300),
                delivered_count: Math.floor((600 + Math.floor(Math.random() * 300)) * 0.98), // 98% delivery rate
                opened_count: Math.floor((600 + Math.floor(Math.random() * 300)) * (0.25 + Math.random() * 0.35)),
                clicked_count: Math.floor((600 + Math.floor(Math.random() * 300)) * (0.02 + Math.random() * 0.08)),
                failed_count: Math.floor((600 + Math.floor(Math.random() * 300)) * 0.02), // 2% failure rate
                unsubscribed_count: Math.floor(Math.random() * 5), // 0-5 unsubscribes
                complained_count: Math.floor(Math.random() * 2) // 0-1 complaints
            } : null
        };
    });
    
    return {
        posts: enhancedPosts,
        meta: {
            pagination: {
                page: 1,
                limit: limit,
                pages: 1,
                total: enhancedPosts.length,
                next: null,
                prev: null
            }
        }
    };
}

/**
 * Creates a fake data provider function that can be used with FrameworkProvider
 * Maps endpoint URLs to fixture data generators
 */
export function createFakeDataProvider() {
    const endpointMap: Record<string, () => unknown> = {
        '/ghost/api/admin/stats/member_count/': fakeDataFixtures.memberCountHistory,
        '/ghost/api/admin/stats/mrr/': fakeDataFixtures.mrrHistory,
        '/ghost/api/admin/stats/newsletter-basic-stats/': fakeDataFixtures.newsletterBasicStats,
        '/ghost/api/admin/stats/newsletter-click-stats/': fakeDataFixtures.newsletterClickStats,
        '/ghost/api/admin/stats/newsletter-stats/': fakeDataFixtures.newsletterStats,
        '/ghost/api/admin/stats/subscriber-count/': fakeDataFixtures.subscriberCount,
        '/ghost/api/admin/stats/top-posts-views/': fakeDataFixtures.topPostsViews,
        '/ghost/api/admin/stats/top-content/': fakeDataFixtures.topContent,
        '/ghost/api/admin/stats/top-posts/': fakeDataFixtures.topPosts
    };

    return async (endpoint: string): Promise<unknown> => {
        // Extract the pathname from the endpoint URL
        const url = new URL(endpoint, 'http://localhost');
        const pathname = url.pathname;
        
        // Add a small delay to simulate network request
        await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 100 + Math.random() * 200);
        });
        
        // Check for exact matches first
        if (pathname in endpointMap) {
            const result = endpointMap[pathname]();
            
            // Handle both sync and async fixture functions
            if (result instanceof Promise) {
                return await result;
            }
            
            return result;
        }
        
        // Check for posts endpoint with analytics includes
        if (pathname === '/ghost/api/admin/posts/' && url.searchParams.has('include')) {
            const includes = url.searchParams.get('include') || '';
            if (includes.includes('count.clicks') || includes.includes('email')) {
                // eslint-disable-next-line no-console
                console.log('Intercepting posts request with analytics:', {pathname, includes, endpoint});
                const limit = parseInt(url.searchParams.get('limit') || '10', 10);
                return withAsyncCache(`postsWithAnalytics:${limit}`, () => generatePostsWithFakeAnalytics(limit));
            }
        }
        
        // Check for dynamic post-specific endpoints
        const referrersMatch = pathname.match(/^\/ghost\/api\/admin\/stats\/posts\/([^/]+)\/top-referrers$/);
        if (referrersMatch) {
            const postId = referrersMatch[1];
            return withDynamicCache(`postReferrers`, postId, generatePostReferrers);
        }
        
        const growthMatch = pathname.match(/^\/ghost\/api\/admin\/stats\/posts\/([^/]+)\/growth$/);
        if (growthMatch) {
            const postId = growthMatch[1];
            return withDynamicCache(`postGrowth`, postId, generatePostGrowth);
        }
        
        const statsMatch = pathname.match(/^\/ghost\/api\/admin\/stats\/posts\/([^/]+)\/stats\/?$/);
        if (statsMatch) {
            const postId = statsMatch[1];
            // eslint-disable-next-line no-console
            console.log('Intercepting post stats request:', {pathname, postId, endpoint});
            const result = withDynamicCache(`postStats`, postId, () => generatePostStats(postId));
            // eslint-disable-next-line no-console
            console.log('Generated post stats result:', result);
            return result;
        }
        
        // Return undefined to fall back to real API
        return undefined;
    };
}

/**
 * Creates a fake data provider specifically for Tinybird endpoints
 * Maps Tinybird endpoint names to fixture data generators
 */
export function createTinybirdFakeDataProvider() {
    const tinybirdEndpointMap: Record<string, () => unknown> = {
        api_active_visitors: fakeDataFixtures.activeVisitors,
        api_top_pages: fakeDataFixtures.topPages,
        api_top_sources: fakeDataFixtures.topSources,
        api_top_locations: fakeDataFixtures.topLocations,
        api_kpis: fakeDataFixtures.kpis
    };

    return async (endpoint: string): Promise<unknown> => {
        // Add a small delay to simulate network request
        await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 100 + Math.random() * 200);
        });
        
        // Check if we have fake data for this Tinybird endpoint  
        if (endpoint in tinybirdEndpointMap) {
            return tinybirdEndpointMap[endpoint]();
        }
        
        // Return undefined to fall back to real API
        return undefined;
    };
}

/**
 * Attempts to intercept a request and return fake data if available
 * Returns undefined if fake data is not enabled or not available for this endpoint
 */
export async function tryInterceptWithFakeData<T = unknown>(
    fakeDataConfig: {enabled: boolean; dataProvider?: (endpoint: string, options?: RequestInit) => Promise<unknown>} | undefined,
    requestEndpoint: string,
    requestOptions: RequestInit
): Promise<T | undefined> {
    // Check if fake data is enabled and should intercept this request
    if (fakeDataConfig?.enabled && fakeDataConfig.dataProvider) {
        try {
            const fakeResponse = await fakeDataConfig.dataProvider(requestEndpoint.toString(), {
                headers: {...requestOptions.headers},
                ...requestOptions
            });
            if (fakeResponse !== undefined) {
                return fakeResponse as T;
            }
        } catch (error) {
            // Fall through to real API if fake data provider fails
            if (import.meta.env.MODE === 'development') {
                // eslint-disable-next-line no-console
                console.warn('Fake data provider failed, falling back to real API:', error);
            }
        }
    }
    
    return undefined;
}