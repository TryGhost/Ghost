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
    console.log('Testing real post fetching...');
    try {
        const posts = await fetchRealPosts(5);
        console.log('Fetched posts:', posts);
        console.log(`Successfully fetched ${posts.length} posts`);
        
        if (posts.length > 0) {
            console.log('Sample post:', {
                id: posts[0].id,
                title: posts[0].title,
                slug: posts[0].slug,
                hasFeatureImage: !!posts[0].feature_image
            });
        }
    } catch (error) {
        console.error('Failed to test real post fetching:', error);
    }
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
 */
function generateTopSources() {
    const sources = [
        {
            source: 'Direct', 
            visits: 320 + Math.floor(Math.random() * 180),
            free_members: Math.floor(Math.random() * 10),
            paid_members: Math.floor(Math.random() * 5),
            mrr: Math.floor(Math.random() * 100)
        },
        {
            source: 'Google', 
            visits: 280 + Math.floor(Math.random() * 120),
            free_members: Math.floor(Math.random() * 8),
            paid_members: Math.floor(Math.random() * 4),
            mrr: Math.floor(Math.random() * 80)
        },
        {
            source: 'Twitter', 
            visits: 150 + Math.floor(Math.random() * 100),
            free_members: Math.floor(Math.random() * 6),
            paid_members: Math.floor(Math.random() * 3),
            mrr: Math.floor(Math.random() * 60)
        },
        {
            source: 'LinkedIn', 
            visits: 90 + Math.floor(Math.random() * 60),
            free_members: Math.floor(Math.random() * 4),
            paid_members: Math.floor(Math.random() * 2),
            mrr: Math.floor(Math.random() * 40)
        },
        {
            source: 'Facebook', 
            visits: 70 + Math.floor(Math.random() * 50),
            free_members: Math.floor(Math.random() * 3),
            paid_members: Math.floor(Math.random() * 1),
            mrr: Math.floor(Math.random() * 30)
        },
        {
            source: 'Reddit', 
            visits: 45 + Math.floor(Math.random() * 40),
            free_members: Math.floor(Math.random() * 2),
            paid_members: 0,
            mrr: 0
        }
    ];
    
    // Sort by visits
    sources.sort((a, b) => b.visits - a.visits);
    
    return {
        data: sources
    };
}

/**
 * Generates fake KPIs data for Tinybird with proper field names and multiple dates
 */
function generateKpis() {
    const data = [];
    const now = new Date();
    
    // Generate 31 days of data (matching the real API response)
    for (let i = 30; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        const visits = Math.floor(Math.random() * 10) + 10; // 10-20 visits
        const pageviews = visits + Math.floor(Math.random() * visits * 10); // More pageviews than visits
        const bounceRate = Math.random(); // 0-1 (0-100%)
        const avgSessionSec = Math.random() * 3000; // 0-3000 seconds
        
        data.push({
            date: date.toISOString().split('T')[0],
            visits,
            pageviews,
            bounce_rate: Number(bounceRate.toFixed(2)),
            avg_session_sec: Number(avgSessionSec.toFixed(2))
        });
    }
    
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
 */
function generateTopLocations() {
    const locations = [
        {location: 'United States', visits: 450 + Math.floor(Math.random() * 200)},
        {location: 'United Kingdom', visits: 180 + Math.floor(Math.random() * 100)},
        {location: 'Canada', visits: 120 + Math.floor(Math.random() * 80)},
        {location: 'Germany', visits: 100 + Math.floor(Math.random() * 60)},
        {location: 'Australia', visits: 85 + Math.floor(Math.random() * 50)},
        {location: 'France', visits: 75 + Math.floor(Math.random() * 40)},
        {location: 'Netherlands', visits: 65 + Math.floor(Math.random() * 35)},
        {location: 'India', visits: 60 + Math.floor(Math.random() * 30)},
        {location: 'Brazil', visits: 55 + Math.floor(Math.random() * 25)},
        {location: 'Japan', visits: 50 + Math.floor(Math.random() * 20)}
    ];
    
    // Sort by visits and take top 8
    locations.sort((a, b) => b.visits - a.visits);
    
    return {
        data: locations.slice(0, 8)
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
 * Generates fake newsletter basic stats for Ghost Admin API
 */
function generateNewsletterBasicStats() {
    const stats = [];
    const now = new Date();
    
    // Generate 5 recent newsletter sends
    for (let i = 0; i < 5; i++) {
        const sendDate = new Date(now);
        sendDate.setDate(sendDate.getDate() - (i * 7 + Math.floor(Math.random() * 3))); // Weekly-ish sends
        
        const sentTo = 800 + Math.floor(Math.random() * 400);
        const openRate = 0.25 + Math.random() * 0.35; // 25-60% open rate
        const totalOpens = Math.floor(sentTo * openRate);
        
        stats.push({
            post_id: `newsletter-post-${i + 1}`,
            post_title: `Newsletter ${i + 1}: Weekly Update`,
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
 * Generates fake newsletter click stats for Ghost Admin API
 */
function generateNewsletterClickStats() {
    const stats = [];
    const now = new Date();
    
    // Generate 5 recent newsletter sends with click data
    for (let i = 0; i < 5; i++) {
        const sendDate = new Date(now);
        sendDate.setDate(sendDate.getDate() - (i * 7 + Math.floor(Math.random() * 3)));
        
        const sentTo = 800 + Math.floor(Math.random() * 400);
        const clickRate = 0.02 + Math.random() * 0.08; // 2-10% click rate
        const totalClicks = Math.floor(sentTo * clickRate);
        
        stats.push({
            post_id: `newsletter-post-${i + 1}`,
            post_title: `Newsletter ${i + 1}: Weekly Update`,
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
 * Fetches real posts from Ghost API for more authentic fake data
 */
async function fetchRealPosts(limit = 10): Promise<any[]> {
    try {
        // Try to fetch real posts from the Ghost API
        const response = await fetch(`/ghost/api/admin/posts/?limit=${limit}&fields=id,uuid,slug,title,published_at,feature_image,status,authors&formats=`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const posts = data.posts || [];
            
            // Filter out any posts without titles (just in case)
            return posts.filter((post: any) => post.title && post.title.trim().length > 0);
        } else {
            console.warn('Ghost API returned non-OK status:', response.status, response.statusText);
        }
    } catch (error) {
        // Fall back to fake posts if API fails
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
 */
async function generateTopPostsViews() {
    // Fetch real posts from the API
    const realPosts = await fetchRealPosts(10);
    
    const stats = realPosts.map((post, i) => {
        const views = 500 - (i * 30) + Math.floor(Math.random() * 100); // Decreasing views with some randomness
        const members = Math.floor(views * (0.05 + Math.random() * 0.15)); // 5-20% conversion to members
        const sentCount = Math.random() > 0.3 ? 800 + Math.floor(Math.random() * 400) : null; // 70% were sent as newsletters
        const openedCount = sentCount ? Math.floor(sentCount * (0.25 + Math.random() * 0.35)) : null;
        
        // Format authors - handle both array and string formats
        let authorsString = 'John Doe';
        if (post.authors && Array.isArray(post.authors)) {
            authorsString = post.authors.map((author: any) => author.name).join(', ');
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
 */
async function generateTopContent() {
    // Fetch real posts for more authentic content
    const realPosts = await fetchRealPosts(15);
    
    const stats = realPosts.map((post, i) => {
        const visits = 400 - (i * 20) + Math.floor(Math.random() * 50); // Decreasing visits with randomness
        
        // Create a realistic pathname from the post slug or title
        let pathname = '/';
        if (post.slug) {
            pathname = `/${post.slug}/`;
        } else if (post.title) {
            pathname = `/${post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}/`;
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
    newsletterBasicStats: () => withCache('newsletterBasicStats', generateNewsletterBasicStats),
    newsletterClickStats: () => withCache('newsletterClickStats', generateNewsletterClickStats),
    topPostsViews: () => withAsyncCache('topPostsViews', generateTopPostsViews),
    topContent: () => withAsyncCache('topContent', generateTopContent)
};

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
        '/ghost/api/admin/stats/top-posts-views/': fakeDataFixtures.topPostsViews,
        '/ghost/api/admin/stats/top-content/': fakeDataFixtures.topContent
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