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
 * Fake data fixture generators for development and demo purposes
 */
export const fakeDataFixtures = {
    memberCountHistory: generateMemberCountHistory,
    mrrHistory: generateMrrHistory
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