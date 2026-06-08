/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {type FeedbackItem} from '@tryghost/admin-x-framework/api/feedback';
import {HttpResponse, http} from 'msw';
import {type LinkItem} from '@tryghost/admin-x-framework/api/links';
import {type NewsletterStatItem} from '@tryghost/admin-x-framework/api/stats';
import {type Post} from '@tryghost/admin-x-framework/api/posts';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {setupMswServer} from '@tryghost/admin-x-framework/test/msw-utils';

// Re-export the server setup for convenience
export const server = setupMswServer();

/**
 * Standard test wrapper for React Query
 */
export const createTestWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                suspense: false
            }
        }
    });
    
    const Wrapper = ({children}: {children: React.ReactNode}) => React.createElement(QueryClientProvider, {client: queryClient}, children);
    Wrapper.displayName = 'TestWrapper';
    return Wrapper;
};

// All types now come directly from the framework

/**
 * Mock data factories - composable with overrides
 */
export const mockData = {
    post: (overrides: Partial<Post> = {}): Post => ({
        id: 'test-post-id',
        url: 'https://example.com/post',
        slug: 'test-post',
        title: 'Test Post',
        uuid: 'test-uuid',
        newsletter: {id: 'newsletter-123'},
        email: {
            email_count: 1000,
            opened_count: 300
        },
        count: {
            clicks: 50
        },
        ...overrides
    }),
    
    feedback: (overrides: Partial<FeedbackItem> = {}): FeedbackItem => ({
        id: 'feedback-1',
        score: 1,
        created_at: '2023-01-01T00:00:00.000Z',
        member: {
            id: 'member-1',
            uuid: 'member-uuid-1',
            name: 'Test Member',
            email: 'test@example.com'
        },
        ...overrides
    }),
    
    newsletterStat: (overrides: Partial<NewsletterStatItem> = {}): NewsletterStatItem => ({
        post_id: 'test-post-id',
        post_title: 'Test Newsletter Post',
        send_date: '2023-01-01T00:00:00.000Z',
        sent_to: 1000,
        total_opens: 300,
        open_rate: 0.3,
        total_clicks: 50,
        click_rate: 0.05,
        ...overrides
    }),
    
    link: (overrides: Partial<LinkItem> = {}): LinkItem => ({
        post_id: 'test-post-id',
        link: {
            link_id: 'link-1',
            from: 'post',
            to: 'https://example.com',
            edited: false
        },
        count: {
            clicks: 10
        },
        ...overrides
    }),
    
    postReferrer: (overrides: Partial<import('@tryghost/admin-x-framework/api/stats').PostReferrerStatItem> = {}) => ({
        source: 'Google',
        referrer_url: 'https://google.com',
        free_members: 50,
        paid_members: 10,
        mrr: 5000,
        ...overrides
    }),

    postGrowthStat: (overrides: Partial<import('@tryghost/admin-x-framework/api/stats').PostGrowthStatItem> = {}) => ({
        post_id: '64d623b64676110001e897d9',
        free_members: 100,
        paid_members: 25,
        mrr: 1250,
        ...overrides
    }),

    mrrHistory: (overrides: Partial<import('@tryghost/admin-x-framework/api/stats').MrrHistoryItem> = {}) => ({
        date: '2024-01-01',
        mrr: 50000,
        currency: 'usd',
        ...overrides
    }),
    
    posts: (items: Partial<Post>[] = []) => ({posts: items.map(item => mockData.post(item))}),
    feedbackList: (items: Partial<FeedbackItem>[] = []) => ({feedback: items.map(item => mockData.feedback(item))}),
    linksList: (items: Partial<LinkItem>[] = []) => ({links: items.map(item => mockData.link(item))}),
    newsletterStatsList: (stats: Partial<NewsletterStatItem>[] = []) => ({stats: stats.map(item => mockData.newsletterStat(item))}),
    postReferrersList: (stats: Partial<import('@tryghost/admin-x-framework/api/stats').PostReferrerStatItem>[] = []) => ({
        stats: stats.map(item => mockData.postReferrer(item)),
        meta: {pagination: {page: 1, limit: 10, pages: 1, total: stats.length, next: null, prev: null}}
    }),
    postGrowthStatsList: (stats: Partial<import('@tryghost/admin-x-framework/api/stats').PostGrowthStatItem>[] = []) => ({
        stats: stats.map(item => mockData.postGrowthStat(item)),
        meta: {pagination: {page: 1, limit: 15, pages: 1, total: stats.length, next: null, prev: null}}
    }),
    mrrHistoryList: (items: Partial<import('@tryghost/admin-x-framework/api/stats').MrrHistoryItem>[] = [], totals = [{currency: 'usd', mrr: 55000}]) => ({
        stats: items.map(item => mockData.mrrHistory(item)),
        meta: {totals}
    })
};

// Default data for stable APIs
const DEFAULT_SITE = {
    url: 'https://example.com',
    title: 'Test Site',
    icon: 'https://example.com/icon.png'
};

const DEFAULT_CONFIG = {
    stats: {enabled: true}
};

const DEFAULT_SETTINGS: Array<Record<string, unknown>> = [];
const DEFAULT_TINYBIRD_TOKEN = 'test-token';

// Simplified config - just 2 patterns
type MockServerConfig = {
    // Pattern 1: Simple declarative data for Ghost endpoints
    posts?: Partial<Post>[];
    feedback?: Partial<FeedbackItem>[];
    links?: Partial<LinkItem>[];
    newsletterBasicStats?: Partial<NewsletterStatItem>[];
    newsletterClickStats?: Partial<NewsletterStatItem>[];
    postReferrers?: Partial<import('@tryghost/admin-x-framework/api/stats').PostReferrerStatItem>[];
    postGrowthStats?: Partial<import('@tryghost/admin-x-framework/api/stats').PostGrowthStatItem>[];
    mrrHistory?: {
        items?: Partial<import('@tryghost/admin-x-framework/api/stats').MrrHistoryItem>[];
        totals?: Array<{currency: string; mrr: number}>;
    };
    
    // Stable APIs (auto-included with defaults unless overridden)
    site?: Record<string, unknown>;
    config?: Record<string, unknown>;
    settings?: Array<Record<string, unknown>>;
    tinybirdToken?: string;
    
    // Pattern 2: Escape hatch for everything complex
    customHandlers?: any[];
};

/**
 * Create simple Ghost API handler
 */
function createGhostHandler(method: 'get' | 'post' | 'put' | 'delete', path: string, response: any) {
    return http[method](path, () => HttpResponse.json(response, {status: 200}));
}

/**
 * Declarative mock server setup - just 2 simple patterns:
 * 
 * Pattern 1: posts: [mockData.post()] (90% of cases)
 * Pattern 2: customHandlers: [endpoint.get('/api/external', {})] (10% of cases)
 * 
 * Auto-includes: site, config, settings, tinybirdToken with sensible defaults
 */
export const mockServer = {
    setup(config: MockServerConfig = {}) {
        const handlers = [];
        
        // Pattern 1: Simple Ghost API endpoints with declarative data
        if (config.posts !== undefined) {
            handlers.push(createGhostHandler('get', '/ghost/api/admin/posts/*', mockData.posts(config.posts)));
        }
        
        if (config.feedback !== undefined) {
            handlers.push(createGhostHandler('get', '/ghost/api/admin/feedback/*', mockData.feedbackList(config.feedback)));
        }
        
        if (config.links !== undefined) {
            handlers.push(createGhostHandler('get', '/ghost/api/admin/links/', mockData.linksList(config.links)));
        }
        
        if (config.newsletterBasicStats !== undefined) {
            handlers.push(createGhostHandler('get', '/ghost/api/admin/stats/newsletter-basic-stats/', mockData.newsletterStatsList(config.newsletterBasicStats)));
        }
        
        if (config.newsletterClickStats !== undefined) {
            handlers.push(createGhostHandler('get', '/ghost/api/admin/stats/newsletter-click-stats/', mockData.newsletterStatsList(config.newsletterClickStats)));
        }
        
        if (config.postReferrers !== undefined) {
            handlers.push(createGhostHandler('get', '/ghost/api/admin/stats/posts/*/top-referrers', mockData.postReferrersList(config.postReferrers)));
        }
        
        if (config.postGrowthStats !== undefined) {
            handlers.push(createGhostHandler('get', '/ghost/api/admin/stats/posts/*/growth', mockData.postGrowthStatsList(config.postGrowthStats)));
        }
        
        if (config.mrrHistory !== undefined) {
            const mrrData = config.mrrHistory.totals !== undefined 
                ? mockData.mrrHistoryList(config.mrrHistory.items || [], config.mrrHistory.totals)
                : mockData.mrrHistoryList(config.mrrHistory.items || []);
            handlers.push(createGhostHandler('get', '/ghost/api/admin/stats/mrr/', mrrData));
        }
        
        // Stable APIs with defaults (always included)
        handlers.push(createGhostHandler('get', '/ghost/api/admin/site/', {site: config.site || DEFAULT_SITE}));
        handlers.push(createGhostHandler('get', '/ghost/api/admin/config/', {config: config.config || DEFAULT_CONFIG}));
        handlers.push(createGhostHandler('get', '/ghost/api/admin/settings/', {settings: config.settings || DEFAULT_SETTINGS}));
        handlers.push(createGhostHandler('get', '/ghost/api/admin/tinybird/token/', {tinybird: {token: config.tinybirdToken || DEFAULT_TINYBIRD_TOKEN}}));
        
        // Pattern 2: Custom handlers for complex scenarios
        if (config.customHandlers) {
            handlers.push(...config.customHandlers);
        }
        
        server.use(...handlers);
        return handlers;
    }
};

/**
 * Lower-level utilities for building custom handlers
 * Use these in the customHandlers array when you need full control
 */
export const endpoint = {
    get(path: string, response: Record<string, unknown>, status = 200) {
        return http.get(path, () => HttpResponse.json(response, {status}));
    },
    
    post(path: string, response: Record<string, unknown>, status = 200) {
        return http.post(path, () => HttpResponse.json(response, {status}));
    },
    
    put(path: string, response: Record<string, unknown>, status = 200) {
        return http.put(path, () => HttpResponse.json(response, {status}));
    },
    
    delete(path: string, response: Record<string, unknown>, status = 200) {
        return http.delete(path, () => HttpResponse.json(response, {status}));
    }
};

export const when = (
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    conditions: Array<{
        if: (request: Request) => boolean;
        response: Record<string, unknown>;
        status?: number;
    }>,
    fallback: Record<string, unknown> = {}
) => {
    return http[method](path, ({request}) => {
        for (const {if: condition, response, status = 200} of conditions) {
            if (condition(request)) {
                return HttpResponse.json(response, {status});
            }
        }
        return HttpResponse.json(fallback, {status: 200});
    });
};

/**
 * Quick setup for PostAnalyticsProvider dependencies
 */
export const setupPostAnalyticsProvider = (postId = 'test-post-id') => {
    return mockServer.setup({
        posts: [mockData.post({id: postId})]
    });
};