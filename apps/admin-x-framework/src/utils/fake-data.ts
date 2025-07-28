/**
 * Safe date formatting helper that logs errors with context
 */
function safeToISOString(date: Date, context: string): string {
    try {
        if (!date || !(date instanceof Date)) {
            // eslint-disable-next-line no-console
            console.error(`[FakeData] Invalid date object in ${context}:`, date);
            return new Date().toISOString();
        }
        
        if (isNaN(date.getTime())) {
            // eslint-disable-next-line no-console
            console.error(`[FakeData] Invalid date value in ${context}:`, date);
            return new Date().toISOString();
        }
        
        return date.toISOString();
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`[FakeData] Error in toISOString for ${context}:`, error, date);
        return new Date().toISOString();
    }
}

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
    locationBreakdown: Array<{location: string; country: string; country_code: string; visits: number}>;
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

    // Generate realistic total metrics - increased 10x
    const totalVisits = 8000 + Math.floor(Math.random() * 4000); // 8000-12000 total visits
    const totalPageviews = Math.floor(totalVisits * (1.8 + Math.random() * 0.7)); // 1.8-2.5 pages per visit
    const totalMembers = Math.floor(totalVisits * (0.08 + Math.random() * 0.12)); // 8-20% conversion rate
    const totalMrr = Math.floor(totalMembers * 0.3 * (15 + Math.random() * 20)); // 30% paid, $15-35/month

    // Distribute visits across 10 top posts (following Pareto principle)
    const postViews = [];
    const remainingViews = Math.floor(totalVisits * 0.7); // 70% of traffic goes to top posts
    
    // More realistic distribution - top post gets ~15-20% of post traffic, not 56%!
    const postShares = [0.20, 0.15, 0.12, 0.10, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03];
    
    for (let i = 0; i < 10; i++) {
        // Use predefined shares with some randomization
        const baseShare = postShares[i] || 0.02;
        const randomFactor = 0.8 + Math.random() * 0.4; // ±20% variation
        const views = Math.floor(remainingViews * baseShare * randomFactor);
        const members = Math.floor(views * (0.05 + Math.random() * 0.15));
        
        postViews.push({postIndex: i, views, members});
    }

    // Generate daily breakdown (31 days) with realistic variation
    const dailyVisits = [];
    let distributedVisits = 0;
    
    // Create a more realistic traffic pattern with weekly cycles
    for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        // Validate the date is valid
        if (isNaN(date.getTime())) {
            // Skip invalid dates
            continue;
        }
        const dayOfWeek = date.getDay();
        
        // Base traffic with weekly pattern (lower on weekends)
        let baseDailyShare = 1 / 31;
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            baseDailyShare *= 0.7; // 30% less traffic on weekends
        } else if (dayOfWeek === 2 || dayOfWeek === 3) {
            baseDailyShare *= 1.2; // Peak on Tuesday/Wednesday
        }
        
        // Add some daily variation and occasional spikes
        const randomFactor = 0.8 + Math.random() * 0.4; // ±20% variation
        const spikeChance = Math.random();
        let spikeFactor = 1;
        if (spikeChance > 0.95) {
            spikeFactor = 1.5 + Math.random(); // Occasional traffic spike (2-2.5x)
        }
        
        const visits = Math.floor(totalVisits * baseDailyShare * randomFactor * spikeFactor);
        const pageviews = Math.floor(visits * (1.8 + Math.random() * 0.7));
        
        dailyVisits.push({
            date: safeToISOString(date, 'dailyVisits').split('T')[0],
            visits,
            pageviews
        });
        
        distributedVisits += visits;
    }

    // Adjust to match total exactly by distributing the difference across all days
    if (dailyVisits.length > 0) {
        const difference = totalVisits - distributedVisits;
        const perDayAdjustment = Math.floor(difference / dailyVisits.length);
        const remainder = difference % dailyVisits.length;
        
        dailyVisits.forEach((day, index) => {
            day.visits += perDayAdjustment;
            if (index < remainder) {
                day.visits += 1;
            }
            // Recalculate pageviews based on adjusted visits
            day.pageviews = Math.floor(day.visits * (1.8 + Math.random() * 0.7));
        });
    }

    // Generate location breakdown that adds up to total
    const locations = [
        {country: 'United States', country_code: 'US'},
        {country: 'United Kingdom', country_code: 'GB'},
        {country: 'Switzerland', country_code: 'CH'},
        {country: 'China', country_code: 'CN'},
        {country: 'Australia', country_code: 'AU'},
        {country: 'Netherlands', country_code: 'NL'},
        {country: 'South Korea', country_code: 'KR'},
        {country: 'Serbia', country_code: 'RS'},
        {country: 'Germany', country_code: 'DE'},
        {country: 'Hungary', country_code: 'HU'},
        {country: 'United Arab Emirates', country_code: 'AE'},
        {country: 'France', country_code: 'FR'},
        {country: 'Mongolia', country_code: 'MN'},
        {country: 'Portugal', country_code: 'PT'},
        {country: 'Canada', country_code: 'CA'}
    ];
    const locationBreakdown = [];
    let remainingLocationVisits = totalVisits;
    
    for (let i = 0; i < locations.length - 1; i++) {
        const share = Math.pow(0.6, i) * (0.5 + Math.random() * 0.3);
        const visits = Math.min(Math.floor(remainingLocationVisits * share), remainingLocationVisits);
        locationBreakdown.push({
            location: locations[i].country,
            country: locations[i].country,
            country_code: locations[i].country_code,
            visits
        });
        remainingLocationVisits -= visits;
    }
    
    // Last location gets remaining visits
    if (remainingLocationVisits > 0) {
        const lastLocation = locations[locations.length - 1];
        locationBreakdown.push({
            location: lastLocation.country,
            country: lastLocation.country,
            country_code: lastLocation.country_code,
            visits: remainingLocationVisits
        });
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
 * Generates fake link tracking data for posts
 */
function generateLinks(postId?: string) {
    const domains = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://github.com/TryGhost/Ghost',
        'https://www.amazon.com/dp/B08N5WRWNW',
        'https://twitter.com/ghost/status/1234567890',
        'https://www.nytimes.com/2024/01/15/technology/ai-chatbots.html',
        'https://medium.com/@user/how-to-build-audience-2024',
        'https://www.producthunt.com/posts/ghost-5-0',
        'https://news.ycombinator.com/item?id=38932165',
        'https://www.theverge.com/2024/1/15/tech-news-update',
        'https://techcrunch.com/2024/01/15/startup-funding-news/',
        'https://www.wired.com/story/future-of-newsletters/',
        'https://substack.com/@writer/p/newsletter-monetization-guide',
        'https://www.notion.so/product/ai',
        'https://spotify.com/episode/tech-podcast-episode-42',
        'https://www.linkedin.com/pulse/content-strategy-2024',
        'https://dribbble.com/shots/20456789-Newsletter-Design',
        'https://www.figma.com/community/file/1234567890',
        'https://codepen.io/pen/awesome-animation',
        'https://stackoverflow.com/questions/12345/nodejs-best-practices',
        'https://dev.to/username/building-modern-apps-4hk2'
    ];
    
    const linkTypes = [
        {prefix: 'https://main.ghost.org/r/', isInternal: false},
        {prefix: 'https://main.ghost.org/', isInternal: true}
    ];
    
    // Generate 5-15 links for a post
    const linkCount = 5 + Math.floor(Math.random() * 10);
    const links = [];
    
    for (let i = 0; i < linkCount; i++) {
        const linkType = linkTypes[Math.floor(Math.random() * linkTypes.length)];
        const linkId = Math.random().toString(36).substring(2, 10);
        const shortId = Math.random().toString(36).substring(2, 10);
        
        let to = '';
        if (linkType.isInternal) {
            // Internal links to other posts with realistic slugs
            const postSlugs = [
                'how-to-grow-your-newsletter-audience',
                'email-marketing-best-practices-2024',
                'building-sustainable-creator-business',
                'newsletter-design-tips-and-tricks',
                'monetization-strategies-for-writers',
                'content-calendar-planning-guide',
                'engaging-your-email-subscribers',
                'newsletter-analytics-deep-dive',
                'writing-compelling-subject-lines',
                'subscriber-retention-strategies'
            ];
            const slug = postSlugs[i % postSlugs.length];
            to = `${linkType.prefix}${slug}/?ref=newsletter&attribution_id=${postId}&attribution_type=post`;
        } else {
            // External links
            const domain = domains[Math.floor(Math.random() * domains.length)];
            to = domain.includes('?') ? `${domain}&ref=main.ghost.org` : `${domain}?ref=main.ghost.org`;
        }
        
        // Generate click count - most links have low clicks
        let clicks = 0;
        const rand = Math.random();
        if (rand > 0.7) {
            clicks = Math.floor(Math.random() * 50); // 30% of links get some clicks
        }
        if (rand > 0.95) {
            clicks = 50 + Math.floor(Math.random() * 100); // 5% get many clicks
        }
        
        links.push({
            post_id: postId || '6859b8b77abd2f0001d816fa',
            link: {
                link_id: linkId,
                from: `${linkType.prefix}${shortId}`,
                to: to,
                edited: false
            },
            count: {
                clicks: clicks
            }
        });
    }
    
    return {
        links,
        meta: {
            pagination: {
                total: links.length,
                page: 1,
                pages: 1
            }
        }
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
    // eslint-disable-next-line no-console
    console.log('✅ Fake data cache cleared! Refresh the page to see new data.');
}

/**
 * Get cache stats for debugging
 */
export function getFakeDataCacheStats(): {size: number; keys: string[]} {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // Validate the date is valid
        if (isNaN(date.getTime())) {
            continue;
        }
        
        // Simulate realistic growth with some randomness
        const paidGrowth = Math.floor(Math.random() * 4); // 0-3 new paid members per day
        const freeGrowth = Math.floor(Math.random() * 15) + 5; // 5-20 new free members per day
        const compedGrowth = Math.random() < 0.3 ? 1 : 0; // 30% chance of 1 comped member
        
        paid += paidGrowth;
        free += freeGrowth;
        comped += compedGrowth;
        
        stats.push({
            date: safeToISOString(date, 'memberCountHistory').split('T')[0],
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
        // Validate the date is valid
        if (isNaN(date.getTime())) {
            continue;
        }
        
        // Simulate MRR growth with some volatility
        const growth = Math.floor(Math.random() * 100) - 10; // -10 to +90 change
        mrr = Math.max(1000, mrr + growth); // Don't go below $1000
        
        stats.push({
            date: safeToISOString(date, 'mrrHistory').split('T')[0],
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
    // Initialize master analytics to get total visits
    initializeMasterAnalytics();
    const totalVisits = masterAnalytics.totalVisits;
    
    // Scale page hits based on total site traffic
    const pages = [
        {pathname: '/', hits: Math.floor(totalVisits * 0.15) + Math.floor(Math.random() * totalVisits * 0.05)}, // 15-20% of total
        {pathname: '/about', hits: Math.floor(totalVisits * 0.06) + Math.floor(Math.random() * totalVisits * 0.02)}, // 6-8% of total
        {pathname: '/pricing', hits: Math.floor(totalVisits * 0.04) + Math.floor(Math.random() * totalVisits * 0.02)}, // 4-6% of total
        {pathname: '/blog', hits: Math.floor(totalVisits * 0.08) + Math.floor(Math.random() * totalVisits * 0.03)}, // 8-11% of total
        {pathname: '/contact', hits: Math.floor(totalVisits * 0.03) + Math.floor(Math.random() * totalVisits * 0.01)}, // 3-4% of total
        {pathname: '/features', hits: Math.floor(totalVisits * 0.05) + Math.floor(Math.random() * totalVisits * 0.02)}, // 5-7% of total
        {pathname: '/docs', hits: Math.floor(totalVisits * 0.04) + Math.floor(Math.random() * totalVisits * 0.02)} // 4-6% of total
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
    // eslint-disable-next-line no-console
    console.log('[FakeData] generateKpis called');
    
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
    // The location field should contain the country code, not the full name
    const data = masterAnalytics.locationBreakdown
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 15) // Take top 15 locations to match real API
        .map(location => ({
            location: location.country_code, // Use country code as location field
            visits: location.visits
        }));
    
    // Add some empty location entries like in real API
    if (data.length > 2) {
        // Insert an empty location with some visits (represents unknown/private locations)
        data.splice(1, 0, {
            location: '',
            visits: Math.floor(data[0].visits * 0.3) // About 30% of top location's visits
        });
    }
    
    // eslint-disable-next-line no-console
    console.log('Generated top locations data:', data);
    
    return {
        meta: [
            {name: 'location', type: 'String'},
            {name: 'visits', type: 'UInt64'}
        ],
        data,
        rows: data.length,
        rows_before_limit_at_least: data.length,
        statistics: {
            elapsed: 0.01 + Math.random() * 0.02,
            rows_read: Math.floor(Math.random() * 50000) + 10000,
            bytes_read: Math.floor(Math.random() * 3000000) + 1000000
        }
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
    
    // Always generate newsletter analytics - match real API format exactly
    const recipientCount = 600 + Math.floor(Math.random() * 300);
    const openedCount = Math.floor(recipientCount * (0.25 + Math.random() * 0.35));
    const openRate = Math.round((openedCount / recipientCount) * 100); // Whole number percentage like real API
    
    // Match the exact Ghost API response structure from real example
    const result = {
        stats: [{
            id: postId,
            recipient_count: recipientCount,
            opened_count: openedCount,
            open_rate: openRate, // Whole number percentage (0-100)
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
        // Validate the date is valid
        if (isNaN(sendDate.getTime())) {
            continue;
        }
        
        const sentTo = 800 + Math.floor(Math.random() * 400);
        const openRate = 0.25 + Math.random() * 0.35; // 25-60% open rate
        const totalOpens = Math.floor(sentTo * openRate);
        
        const totalClicks = Math.floor(totalOpens * (0.1 + Math.random() * 0.2)); // 10-30% of opens click
        const members = Math.floor(sentTo * (0.08 + Math.random() * 0.12)); // 8-20% conversion to members
        
        stats.push({
            post_id: post.id,
            post_title: post.title,
            send_date: safeToISOString(sendDate, 'newsletterStats'),
            sent_to: sentTo,
            // Core newsletter metrics
            total_opens: totalOpens,
            open_rate: Number(openRate.toFixed(3)),
            total_clicks: totalClicks,
            click_rate: Number((totalClicks / sentTo).toFixed(3)),
            // Member analytics
            members,
            free_members: Math.floor(members * 0.7),
            paid_members: Math.floor(members * 0.3),
            // Visitor analytics (estimate based on engagement)
            visitors: Math.floor(sentTo * 0.6), // Assume 60% of recipients visit
            views: Math.floor(sentTo * 0.8) // Assume 80% view the email
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
        
        const openRate = 0.25 + Math.random() * 0.35;
        const totalOpens = Math.floor(sentTo * openRate);
        const members = Math.floor(sentTo * (0.08 + Math.random() * 0.12)); // 8-20% conversion to members
        
        stats.push({
            post_id: post.id,
            post_title: post.title,
            send_date: safeToISOString(sendDate, 'newsletterStats'),
            sent_to: sentTo,
            // Core newsletter metrics
            total_opens: totalOpens,
            open_rate: Number(openRate.toFixed(3)),
            total_clicks: totalClicks,
            click_rate: Number(clickRate.toFixed(3)),
            // Member analytics
            members,
            free_members: Math.floor(members * 0.7),
            paid_members: Math.floor(members * 0.3),
            // Visitor analytics (estimate based on engagement)
            visitors: Math.floor(sentTo * 0.6), // Assume 60% of recipients visit
            views: Math.floor(sentTo * 0.8) // Assume 80% view the email
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
            send_date: safeToISOString(sendDate, 'newsletterStats'),
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
        // Validate the date is valid
        if (isNaN(date.getTime())) {
            continue;
        }
        
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
            date: safeToISOString(date, 'subscriberStats').split('T')[0],
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
        published_at: (() => {
            const daysAgo = Math.floor(Math.random() * 90);
            const pubDate = new Date();
            pubDate.setDate(pubDate.getDate() - daysAgo);
            return safeToISOString(pubDate, 'fallbackPost.published_at');
        })(),
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
        
        // Generate consistent email analytics based on post ID for cross-endpoint consistency
        const postIdSeed = String(post.id).split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        const seededRandom = (seed: number) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };
        
        // Newsletter stats - use seeded random for consistency
        const sentCount = 600 + Math.floor(seededRandom(postIdSeed) * 300); // Always generate sent count
        const openRate = 0.25 + seededRandom(postIdSeed + 1) * 0.35;
        const openedCount = Math.floor(sentCount * openRate);
        const clickRate = 0.1 + seededRandom(postIdSeed + 2) * 0.15;
        const clickedCount = Math.floor(sentCount * clickRate);
        
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
            // Core analytics - ensure all posts have these
            visitors: views, // Add visitors field
            views,
            members,
            free_members: Math.floor(members * 0.7),
            paid_members: Math.floor(members * 0.3),
            // Newsletter analytics - always present for consistency
            sent_count: sentCount,
            opened_count: openedCount,
            open_rate: Number((openRate * 100).toFixed(1)), // Convert to percentage (0-100)
            clicked_count: clickedCount,
            click_rate: Number((clickRate * 100).toFixed(1)), // Convert to percentage (0-100)
            // Additional metrics
            signups: members, // Alias for members
            conversions: members // Alias for members (for Growth tab compatibility)
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
        
        // Generate newsletter analytics (70% chance post was sent as newsletter)
        const wasSentAsNewsletter = Math.random() > 0.3;
        const sentCount = wasSentAsNewsletter ? 600 + Math.floor(Math.random() * 300) : null;
        const openedCount = sentCount ? Math.floor(sentCount * (0.25 + Math.random() * 0.35)) : null;
        const clickedCount = openedCount ? Math.floor(openedCount * (0.1 + Math.random() * 0.2)) : Math.floor(postAnalytics.views * (0.02 + Math.random() * 0.08));
        
        return {
            post_id: post.id,
            post_uuid: post.uuid || post.id,
            title: post.title,
            slug: post.slug,
            published_at: post.published_at,
            feature_image: post.feature_image || `https://images.unsplash.com/photo-${1500000000 + i}?w=800&h=600`,
            status: post.status || 'published',
            // Core analytics - ensure all posts have these
            visitors: postAnalytics.views,
            views: postAnalytics.views,
            members: postAnalytics.members,
            conversions: postAnalytics.members, // Members gained from this post
            free_members: Math.floor(postAnalytics.members * 0.7),
            paid_members: Math.floor(postAnalytics.members * 0.3),
            conversion_rate: postAnalytics.views > 0 ? Number((postAnalytics.members / postAnalytics.views * 100).toFixed(1)) : 0,
            // Newsletter analytics
            sent_count: sentCount,
            opened_count: openedCount,
            open_rate: openedCount && sentCount ? Number((openedCount / sentCount).toFixed(3)) : null,
            clicked_count: clickedCount,
            click_rate: sentCount ? Number((clickedCount / sentCount).toFixed(3)) : null,
            // Additional aliases
            signups: postAnalytics.members,
            clicks: clickedCount
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
    links: () => withCache('links', generateLinks),
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
        
        // Generate consistent email analytics based on post ID for cross-endpoint consistency
        const postIdSeed = String(post.id).split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        const seededRandom = (seed: number) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };
        
        const emailCount = 600 + Math.floor(seededRandom(postIdSeed) * 300);
        const openRate = 0.25 + seededRandom(postIdSeed + 1) * 0.35;
        const openedCount = Math.floor(emailCount * openRate);
        const clickRate = 0.02 + seededRandom(postIdSeed + 2) * 0.08;
        const clickedCount = Math.floor(emailCount * clickRate);
        
        // eslint-disable-next-line no-console
        console.log(`Generating fake analytics for post ${i}:`, {
            postTitle: post.title,
            postId: post.id,
            views: postAnalytics.views,
            members: postAnalytics.members,
            emailCount,
            openRate: Math.round(openRate * 100) + '%'
        });
        
        return {
            ...post,
            // Add fake click analytics
            count: {
                clicks: Math.floor(postAnalytics.views * (0.05 + seededRandom(postIdSeed + 3) * 0.15)), // 5-20% of views result in clicks
                members: postAnalytics.members,
                paid_conversions: Math.floor(postAnalytics.members * 0.3), // 30% paid conversion
                signups: postAnalytics.members,
                visitors: postAnalytics.views, // Add visitors field for UI
                views: postAnalytics.views // Add views field as alternative
            },
            // Always add newsletter analytics for all posts - use seeded random for consistency
            email: {
                email_count: emailCount, // UI expects this field name
                sent_count: emailCount,
                delivered_count: Math.floor(emailCount * 0.98), // 98% delivery rate
                opened_count: openedCount,
                clicked_count: clickedCount,
                failed_count: Math.floor(emailCount * 0.02), // 2% failure rate
                unsubscribed_count: Math.floor(seededRandom(postIdSeed + 4) * 5), // 0-5 unsubscribes
                complained_count: Math.floor(seededRandom(postIdSeed + 5) * 2) // 0-1 complaints
            }
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
        '/ghost/api/admin/stats/top-posts/': fakeDataFixtures.topPosts,
        '/ghost/api/admin/links/': fakeDataFixtures.links
    };

    return async (endpoint: string): Promise<unknown> => {
        // eslint-disable-next-line no-console
        console.log('[FakeData] Admin API provider called with endpoint:', endpoint);
        
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
        
        // Check for individual post fetching
        const postMatch = pathname.match(/^\/ghost\/api\/admin\/posts\/([^/]+)\/?$/);
        if (postMatch) {
            const postId = postMatch[1];
            // eslint-disable-next-line no-console
            console.log('Intercepting individual post request:', {pathname, postId});
            return withAsyncCache(`post:${postId}`, async () => {
                // Fetch the real post first
                const realPosts = await fetchRealPosts(10);
                const post = realPosts.find(p => p.id === postId) || realPosts[0];
                
                if (!post) {
                    return {posts: []};
                }
                
                // Use seeded random based on post ID for consistency
                const postIdSeed = String(postId).split('').reduce((a, b) => {
                    a = ((a << 5) - a) + b.charCodeAt(0);
                    return a & a;
                }, 0);
                const seededRandom = (seed: number) => {
                    const x = Math.sin(seed) * 10000;
                    return x - Math.floor(x);
                };
                
                const emailCount = 600 + Math.floor(seededRandom(postIdSeed) * 300);
                const openedCount = Math.floor(emailCount * (0.25 + seededRandom(postIdSeed + 1) * 0.35));
                const clickCount = Math.floor(emailCount * (0.02 + seededRandom(postIdSeed + 2) * 0.08));
                
                // Add email and newsletter data for the Newsletter tab
                const enhancedPost = {
                    ...post,
                    email: {
                        email_count: emailCount,
                        opened_count: openedCount,
                        status: 'sent'
                    },
                    newsletter: {
                        id: 'default-newsletter',
                        name: 'Default Newsletter'
                    },
                    count: {
                        clicks: clickCount,
                        positive_feedback: 10 + Math.floor(seededRandom(postIdSeed + 3) * 20),
                        negative_feedback: 1 + Math.floor(seededRandom(postIdSeed + 4) * 5)
                    }
                };
                
                return {
                    posts: [enhancedPost]
                };
            });
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
        
        // Check for links endpoint with post filter
        if (pathname === '/ghost/api/admin/links/' && url.searchParams.has('filter')) {
            const filter = url.searchParams.get('filter') || '';
            const postIdMatch = filter.match(/post_id:'([^']+)'/);
            if (postIdMatch) {
                const postId = postIdMatch[1];
                return withDynamicCache(`links`, postId, () => generateLinks(postId));
            }
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
        // eslint-disable-next-line no-console
        console.log('[FakeData] Tinybird provider called with endpoint:', endpoint);
        
        // Add a small delay to simulate network request
        await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 100 + Math.random() * 200);
        });
        
        // The endpoint might be just the name or a full URL with query params
        let endpointName = endpoint;
        let postUuid: string | null = null;
        let dateFrom: string | null = null;
        let dateTo: string | null = null;
        
        // Check if endpoint has query params
        if (endpoint.includes('?')) {
            const [baseName, queryString] = endpoint.split('?');
            endpointName = baseName;
            const searchParams = new URLSearchParams(queryString);
            postUuid = searchParams.get('post_uuid');
            dateFrom = searchParams.get('date_from');
            dateTo = searchParams.get('date_to');
        } else {
            // No query params, just the endpoint name
            endpointName = endpoint;
        }
        
        // Check if we have fake data for this Tinybird endpoint  
        if (endpointName in tinybirdEndpointMap || endpoint in tinybirdEndpointMap) {
            let data;
            try {
                // eslint-disable-next-line no-console
                console.log('[FakeData] Generating data for Tinybird endpoint:', endpointName);
                data = tinybirdEndpointMap[endpointName] ? tinybirdEndpointMap[endpointName]() : tinybirdEndpointMap[endpoint]();
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('[FakeData] Error generating data for endpoint:', endpointName, error);
                throw error;
            }
            
            // Apply date filtering for KPIs even without post_uuid
            if (endpointName === 'api_kpis' && (dateFrom || dateTo) && !postUuid) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const kpiData = data as any;
                if (kpiData.data && Array.isArray(kpiData.data)) {
                    // eslint-disable-next-line no-console
                    console.log('[FakeData] Site-wide KPI date range inputs:', {dateFrom, dateTo});
                    const fromDate = dateFrom ? new Date(dateFrom) : new Date('2000-01-01');
                    const toDate = dateTo ? new Date(dateTo) : new Date();
                    
                    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
                        // eslint-disable-next-line no-console
                        console.error('[FakeData] Invalid date range:', {dateFrom, dateTo, fromDate, toDate});
                    }
                    
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const filteredData = kpiData.data.filter((item: any) => {
                        try {
                            const itemDate = new Date(item.date);
                            if (isNaN(itemDate.getTime())) {
                                // eslint-disable-next-line no-console
                                console.error('[FakeData] Invalid date in site-wide KPI filtering:', item.date);
                                return false;
                            }
                            return itemDate >= fromDate && itemDate <= toDate;
                        } catch (e) {
                            // eslint-disable-next-line no-console
                            console.error('[FakeData] Error in site-wide KPI date filtering:', item.date, e);
                            return false;
                        }
                    });
                    
                    // eslint-disable-next-line no-console
                    console.log('📅 Site-wide KPI date filtering:', {
                        dateFrom,
                        dateTo,
                        originalDays: kpiData.data.length,
                        filteredDays: filteredData.length
                    });
                    
                    return {
                        ...kpiData,
                        data: filteredData,
                        rows: filteredData.length
                    };
                }
            }
            
            // If post_uuid is provided, filter the data for that specific post
            if (postUuid && data) {
                // For KPIs, filter to only show data for the specific post
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (endpointName === 'api_kpis' && (data as any).data && Array.isArray((data as any).data)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const kpiData = data as any;
                    
                    // First, filter by date range if provided
                    let filteredByDate = kpiData.data;
                    if (dateFrom || dateTo) {
                        const fromDate = dateFrom ? new Date(dateFrom) : new Date('2000-01-01');
                        const toDate = dateTo ? new Date(dateTo) : new Date();
                        
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        filteredByDate = kpiData.data.filter((item: any) => {
                            try {
                                if (!item || !item.date) {
                                    // eslint-disable-next-line no-console
                                    console.error('[FakeData] Missing date in KPI item:', item);
                                    return false;
                                }
                                const itemDate = new Date(item.date);
                                if (isNaN(itemDate.getTime())) {
                                    // eslint-disable-next-line no-console
                                    console.error('[FakeData] Invalid date in post KPI filtering:', item.date, 'from item:', item);
                                    return false;
                                }
                                return itemDate >= fromDate && itemDate <= toDate;
                            } catch (e) {
                                // eslint-disable-next-line no-console
                                console.error('[FakeData] Error parsing date in post KPI filtering:', item?.date, e);
                                return false;
                            }
                        });
                        
                        // eslint-disable-next-line no-console
                        console.log('📅 Date filtering applied:', {
                            dateFrom,
                            dateTo,
                            originalDays: kpiData.data.length,
                            filteredDays: filteredByDate.length
                        });
                    } else {
                        // If no date range is specified but we have a post_uuid,
                        // simulate a post that was published within the data range
                        // This ensures the total matches the chart when both use different date ranges
                        
                        // Use post UUID to generate a consistent publication date
                        const hashCode = postUuid.split('').reduce((acc, char) => {
                            return ((acc << 5) - acc) + char.charCodeAt(0);
                        }, 0);
                        const daysAgo = 5 + (Math.abs(hashCode) % 20); // 5-25 days ago
                        const publicationDate = new Date();
                        publicationDate.setDate(publicationDate.getDate() - daysAgo);
                        
                        // Validate the publication date
                        if (isNaN(publicationDate.getTime())) {
                            // Fall back to 7 days ago if date is invalid
                            publicationDate.setTime(Date.now() - (7 * 24 * 60 * 60 * 1000));
                        }
                        
                        // Filter to only show data from publication date onwards
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        filteredByDate = kpiData.data.filter((item: any) => {
                            try {
                                if (!item || !item.date) {
                                    // eslint-disable-next-line no-console
                                    console.error('[FakeData] Missing date in publication filtering:', item);
                                    return false;
                                }
                                const itemDate = new Date(item.date);
                                if (isNaN(itemDate.getTime())) {
                                    // eslint-disable-next-line no-console
                                    console.error('[FakeData] Invalid date in publication filtering:', item.date);
                                    return false;
                                }
                                return itemDate >= publicationDate;
                            } catch (e) {
                                // eslint-disable-next-line no-console
                                console.error('[FakeData] Error in publication date filtering:', item?.date, e);
                                return false;
                            }
                        });
                        
                        // eslint-disable-next-line no-console
                        console.log('📅 Implicit date filtering for post:', {
                            postUuid,
                            daysAgo,
                            publicationDate: safeToISOString(publicationDate, 'postKpiFiltering').split('T')[0],
                            filteredDays: filteredByDate.length
                        });
                    }
                    
                    // Debug logging
                    // eslint-disable-next-line no-console
                    console.log('🎯 Post-specific KPI filtering activated:', {
                        endpoint: endpointName,
                        postUuid,
                        dateRange: {dateFrom, dateTo},
                        daysOfData: filteredByDate.length
                    });
                    
                    // Generate completely independent data for this post
                    // Use the post UUID to seed the random number generator for consistency
                    const postSeed = postUuid.split('').reduce((acc, char) => {
                        return ((acc << 5) - acc) + char.charCodeAt(0);
                    }, 0);
                    
                    const seededRandom = (seed: number) => {
                        const x = Math.sin(seed) * 10000;
                        return x - Math.floor(x);
                    };
                    
                    // Generate a base traffic level for this post (50-500 visits per day average)
                    const baseTrafficLevel = 50 + Math.floor(seededRandom(postSeed) * 450);
                    
                    // Generate daily data with realistic variation
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const scaledData = filteredByDate.map((item: any, index: number) => {
                        if (!item || !item.date) {
                            // eslint-disable-next-line no-console
                            console.error('[FakeData] Missing date in scaledData mapping:', item);
                            return item; // Return as-is to preserve structure
                        }
                        
                        let dayOfWeek = 0;
                        try {
                            const itemDate = new Date(item.date);
                            if (isNaN(itemDate.getTime())) {
                                // eslint-disable-next-line no-console
                                console.error('[FakeData] Invalid date in scaledData mapping:', item.date);
                                dayOfWeek = 1; // Default to Monday
                            } else {
                                dayOfWeek = itemDate.getDay();
                            }
                        } catch (e) {
                            // eslint-disable-next-line no-console
                            console.error('[FakeData] Error getting day of week:', item.date, e);
                            dayOfWeek = 1; // Default to Monday
                        }
                        let dayMultiplier = 1;
                        
                        // Create variation pattern
                        // Weekend reduction
                        if (dayOfWeek === 0 || dayOfWeek === 6) {
                            dayMultiplier *= 0.7;
                        }
                        
                        // Day-to-day variation (±40%)
                        dayMultiplier *= 0.6 + seededRandom(postSeed + index * 100) * 0.8;
                        
                        // Occasional spikes (10% chance of 2x traffic)
                        if (seededRandom(postSeed + index * 200) > 0.9) {
                            dayMultiplier *= 2;
                        }
                        
                        // For very short ranges, add a more dramatic pattern
                        if (filteredByDate.length <= 7) {
                            if (index === 0) {
                                dayMultiplier *= 0.5; // Start low
                            } else if (index === Math.floor(filteredByDate.length / 2)) {
                                dayMultiplier *= 1.5; // Peak in middle
                            }
                        }
                        
                        const postVisits = Math.max(10, Math.round(baseTrafficLevel * dayMultiplier));
                        const postPageviews = Math.round(postVisits * (1.5 + seededRandom(postSeed + index * 300) * 1.0)); // 1.5-2.5 pageviews per visit
                        
                        return {
                            ...item,
                            visits: postVisits,
                            pageviews: postPageviews,
                            bounce_rate: Number((0.35 + seededRandom(postSeed + index * 400) * 0.3).toFixed(2)),
                            avg_session_sec: Number((120 + seededRandom(postSeed + index * 500) * 240).toFixed(2))
                        };
                    });
                    
                    // Return the data in the same format as the original
                    return {
                        ...kpiData,
                        data: scaledData,
                        rows: scaledData.length
                    };
                }
                
                // For top pages, filter to only the specific post
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (endpointName === 'api_top_pages' && (data as any).stats) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const dataWithStats = data as any;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const filteredStats = dataWithStats.stats.filter((item: any) => item.post_uuid === postUuid || item.post_id === postUuid);
                    
                    // If we found the post in the stats, return it
                    if (filteredStats.length > 0) {
                        return {...dataWithStats, stats: filteredStats};
                    }
                    
                    // Otherwise create a minimal entry with some visits
                    return {...dataWithStats, stats: [{
                        pathname: `/p/${postUuid}/`,
                        visits: 100 + Math.floor(Math.random() * 400), // Random visits between 100-500
                        title: 'Current Post',
                        post_uuid: postUuid,
                        post_id: postUuid,
                        post_type: 'post',
                        url_exists: true
                    }]};
                }
                
                // For top sources, filter to sources for this specific post
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (endpointName === 'api_top_sources' && (data as any).data) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const dataWithData = data as any;
                    // Generate a random but deterministic total visits for this post
                    const postSeed = postUuid.split('').reduce((acc, char) => {
                        return ((acc << 5) - acc) + char.charCodeAt(0);
                    }, 0);
                    
                    // Create a seeded random function for this scope
                    const seededRandom = (seed: number) => {
                        const x = Math.sin(seed) * 10000;
                        return x - Math.floor(x);
                    };
                    
                    const postTotalVisits = 100 + Math.floor(seededRandom(postSeed) * 400); // 100-500 visits
                    
                    // Return a subset of sources to simulate post-specific traffic
                    const topSources = dataWithData.data.slice(0, 5);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const totalSourceVisits = topSources.reduce((sum: number, s: any) => sum + s.visits, 0);
                    
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const filteredSources = topSources.map((source: any, index: number) => {
                        const sourceRatio = source.visits / totalSourceVisits;
                        const postSourceVisits = Math.floor(postTotalVisits * sourceRatio * (0.8 + seededRandom(postSeed + index) * 0.4));
                        
                        return {
                            ...source,
                            visits: postSourceVisits,
                            free_members: Math.floor(source.free_members * 0.1),
                            paid_members: Math.floor(source.paid_members * 0.1),
                            mrr: Math.floor(source.mrr * 0.1)
                        };
                    });
                    
                    return {...dataWithData, data: filteredSources};
                }
                
                // For top locations, filter for post-specific data
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (endpointName === 'api_top_locations' && (data as any).data) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const dataWithData = data as any;
                    // Generate a random but deterministic total visits for this post
                    const postSeed = postUuid.split('').reduce((acc, char) => {
                        return ((acc << 5) - acc) + char.charCodeAt(0);
                    }, 0);
                    
                    // Create a seeded random function for this scope
                    const seededRandom = (seed: number) => {
                        const x = Math.sin(seed) * 10000;
                        return x - Math.floor(x);
                    };
                    
                    const postTotalVisits = 100 + Math.floor(seededRandom(postSeed) * 400); // 100-500 visits
                    
                    // Return a subset of locations to simulate post-specific traffic
                    const topLocations = dataWithData.data.slice(0, 10);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const totalLocationVisits = topLocations.reduce((sum: number, l: any) => sum + l.visits, 0);
                    
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const filteredLocations = topLocations.map((location: any, index: number) => {
                        const locationRatio = location.visits / totalLocationVisits;
                        const postLocationVisits = Math.floor(postTotalVisits * locationRatio * (0.8 + seededRandom(postSeed + index + 1000) * 0.4));
                        
                        return {
                            ...location,
                            visits: postLocationVisits
                        };
                    });
                    
                    return {...dataWithData, data: filteredLocations};
                }
            }
            
            return data;
        }
        
        // Return undefined to fall back to real API
        return undefined;
    };
}

// Track the last fake data enabled state to detect changes
let lastFakeDataEnabled: boolean | null = null;

/**
 * Attempts to intercept a request and return fake data if available
 * Returns undefined if fake data is not enabled or not available for this endpoint
 */
export async function tryInterceptWithFakeData<T = unknown>(
    fakeDataConfig: {enabled: boolean; dataProvider?: (endpoint: string, options?: RequestInit) => Promise<unknown>} | undefined,
    requestEndpoint: string,
    requestOptions: RequestInit
): Promise<T | undefined> {
    // Check if fake data setting has changed and clear cache if so
    const currentFakeDataEnabled = fakeDataConfig?.enabled || false;
    if (lastFakeDataEnabled !== null && lastFakeDataEnabled !== currentFakeDataEnabled) {
        clearFakeDataCache();
        // eslint-disable-next-line no-console
        console.log(`🔄 Fake data ${currentFakeDataEnabled ? 'enabled' : 'disabled'} - cache cleared`);
    }
    lastFakeDataEnabled = currentFakeDataEnabled;
    
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