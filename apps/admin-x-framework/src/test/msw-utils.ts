import {HttpResponse, http} from 'msw';
import {setupServer} from 'msw/node';

/**
 * Common Ghost API response fixtures
 */
export const fixtures = {
    // Global data fixtures
    config: {
        version: '5.x',
        environment: 'testing',
        database: 'mysql8',
        mail: 'SMTP',
        labs: {},
        clientExtensions: {},
        enableDeveloperExperiments: true,
        stripeDirect: false
    },

    settings: {
        title: 'Test Site',
        description: 'A test Ghost site',
        logo: null,
        cover_image: null,
        icon: null,
        accent_color: '#FF1A75',
        locale: 'en',
        timezone: 'Etc/UTC',
        codeinjection_head: null,
        codeinjection_foot: null,
        navigation: [],
        secondary_navigation: []
    },

    site: {
        title: 'Test Site',
        url: 'http://localhost:3000',
        version: '5.x'
    },

    user: {
        id: '1',
        name: 'Test User',
        slug: 'test-user',
        email: 'test@example.com',
        profile_image: null,
        cover_image: null,
        bio: null,
        website: null,
        location: null,
        facebook: null,
        twitter: null,
        accessibility: null,
        status: 'active',
        meta_title: null,
        meta_description: null,
        tour: null,
        last_seen: '2024-01-01T00:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        roles: [{
            id: '1',
            name: 'Administrator',
            description: 'Administrators',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z'
        }]
    },

    // Links fixtures
    linksBulkSuccess: {
        bulk: {
            action: 'updateLink',
            meta: {
                stats: {successful: 1, unsuccessful: 0},
                errors: [],
                unsuccessfulData: []
            }
        }
    },

    // Stats fixtures (from our previous work)
    memberCountHistory: {
        stats: [
            {date: '2024-01-01', paid: 100, free: 500, comped: 10, paid_subscribed: 5, paid_canceled: 2},
            {date: '2024-01-02', paid: 102, free: 505, comped: 10, paid_subscribed: 3, paid_canceled: 1}
        ],
        meta: {totals: {paid: 102, free: 505, comped: 10}}
    },

    mrrHistory: {
        stats: [
            {date: '2024-01-01', mrr: 1000, currency: 'USD'},
            {date: '2024-01-02', mrr: 1020, currency: 'USD'}
        ],
        meta: {totals: {mrr: 1020}}
    },

    // Tinybird fixtures
    tinybirdToken: {
        tinybird: {
            token: 'mock-tinybird-token-for-testing'
        }
    }
};

/**
 * Common Ghost API handlers
 */
export const handlers = {
    // Global data handlers
    browseConfig: http.get('/ghost/api/admin/config/', () => {
        return HttpResponse.json(fixtures.config);
    }),

    browseSettings: http.get('/ghost/api/admin/settings/', () => {
        return HttpResponse.json({settings: [fixtures.settings]});
    }),

    browseSite: http.get('/ghost/api/admin/site/', () => {
        return HttpResponse.json({site: fixtures.site});
    }),

    browseMe: http.get('/ghost/api/admin/users/me/', () => {
        return HttpResponse.json({users: [fixtures.user]});
    }),

    // Links handlers
    updateLinksBulk: http.put('/ghost/api/admin/links/bulk/', () => {
        return HttpResponse.json(fixtures.linksBulkSuccess);
    }),

    // Stats handlers
    browseMemberCountHistory: http.get('/ghost/api/admin/stats/member_count/', () => {
        return HttpResponse.json(fixtures.memberCountHistory);
    }),

    browseMrrHistory: http.get('/ghost/api/admin/stats/mrr/', () => {
        return HttpResponse.json(fixtures.mrrHistory);
    }),

    // Tinybird handlers
    browseTinybirdToken: http.get('/ghost/api/admin/tinybird/token/', () => {
        return HttpResponse.json(fixtures.tinybirdToken);
    })
};

/**
 * Creates an MSW server with common Ghost API handlers
 */
export function createMswServer(additionalHandlers: Array<ReturnType<typeof http.get | typeof http.post | typeof http.put | typeof http.delete>> = []) {
    return setupServer(
        ...Object.values(handlers),
        ...additionalHandlers
    );
}

/**
 * Sets up MSW server for testing with common lifecycle management
 */
export function setupMswServer(additionalHandlers: Array<ReturnType<typeof http.get | typeof http.post | typeof http.put | typeof http.delete>> = []) {
    const server = createMswServer(additionalHandlers);

    beforeAll(() => server.listen());
    afterEach(() => {
        server.resetHandlers();
    });
    afterAll(() => server.close());

    return server;
}

/**
 * Helper to create custom handlers that override defaults
 */
export function createHandler(method: 'get' | 'post' | 'put' | 'delete', path: string, response: Record<string, unknown> | Array<unknown>, status = 200) {
    const httpMethod = http[method];
    return httpMethod(path, () => {
        if (status >= 400) {
            return new HttpResponse(null, {status});
        }
        return HttpResponse.json(response);
    });
}

/**
 * Helper to create error handlers
 */
export function createErrorHandler(method: 'get' | 'post' | 'put' | 'delete', path: string, status = 500) {
    const httpMethod = http[method];
    return httpMethod(path, () => {
        return new HttpResponse(null, {status});
    });
} 