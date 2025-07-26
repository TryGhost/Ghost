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
 * Fake data fixture generators for development and demo purposes
 */
export const fakeDataFixtures = {
    memberCountHistory: generateMemberCountHistory,
    mrrHistory: generateMrrHistory,
    // Tinybird endpoints
    activeVisitors: generateActiveVisitors,
    topPages: generateTopPages,
    topSources: generateTopSources,
    kpis: generateKpis
};

/**
 * Creates a fake data provider function that can be used with FrameworkProvider
 * Maps endpoint URLs to fixture data generators
 */
export function createFakeDataProvider() {
    const endpointMap: Record<string, () => unknown> = {
        '/ghost/api/admin/stats/member_count/': fakeDataFixtures.memberCountHistory,
        '/ghost/api/admin/stats/mrr/': fakeDataFixtures.mrrHistory
    };

    return async (endpoint: string): Promise<unknown> => {
        // Extract the pathname from the endpoint URL
        const url = new URL(endpoint, 'http://localhost');
        const pathname = url.pathname;
        
        // Add a small delay to simulate network request
        await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 100 + Math.random() * 200);
        });
        
        // Check if we have fake data for this endpoint
        if (pathname in endpointMap) {
            return endpointMap[pathname]();
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