/**
 * MSW implementation for Ghost tests
 * 
 * This file provides utilities to set up MSW for testing Ghost API endpoints
 */

import {HttpResponse, PathParams, http} from 'msw';
import {setupServer} from 'msw/node';
import {Page} from '@playwright/test';
import {responseFixtures} from './fixtures';
import {JsonValue} from 'type-fest';

// Re-export MSW types and functions
export {http, HttpResponse};

/**
 * Create Ghost API handlers using fixture data
 */
export function createGhostAPIHandlers() {
    return [
        // Settings
        http.get('/ghost/api/admin/settings/', () => HttpResponse.json(responseFixtures.settings)),
        
        // Users
        http.get('/ghost/api/admin/users/', () => HttpResponse.json(responseFixtures.users)),
        
        // Current user (me)
        http.get('/ghost/api/admin/users/me/', () => HttpResponse.json(responseFixtures.me)),
        
        // Roles
        http.get('/ghost/api/admin/roles/', () => HttpResponse.json(responseFixtures.roles)),
        
        // Site
        http.get('/ghost/api/admin/site/', () => HttpResponse.json(responseFixtures.site)),
        
        // Config
        http.get('/ghost/api/admin/config/', () => HttpResponse.json(responseFixtures.config)),
        
        // Invites
        http.get('/ghost/api/admin/invites/', () => HttpResponse.json(responseFixtures.invites)),
        
        // Custom Theme Settings
        http.get('/ghost/api/admin/custom_theme_settings/', () => HttpResponse.json(responseFixtures.customThemeSettings)),
        
        // Tiers
        http.get('/ghost/api/admin/tiers/', () => HttpResponse.json(responseFixtures.tiers)),
        
        // Labels
        http.get('/ghost/api/admin/labels/', () => HttpResponse.json(responseFixtures.labels)),
        
        // Offers
        http.get('/ghost/api/admin/offers/', () => HttpResponse.json(responseFixtures.offers)),
        
        // Themes
        http.get('/ghost/api/admin/themes/', () => HttpResponse.json(responseFixtures.themes)),
        
        // Newsletters
        http.get('/ghost/api/admin/newsletters/', () => HttpResponse.json(responseFixtures.newsletters)),
        
        // Actions
        http.get('/ghost/api/admin/actions/', () => HttpResponse.json(responseFixtures.actions)),
        
        // Recommendations
        http.get('/ghost/api/admin/recommendations/', () => HttpResponse.json(responseFixtures.recommendations)),
        
        // Incoming Recommendations
        http.get('/ghost/api/admin/recommendations/incoming/', () => HttpResponse.json(responseFixtures.incomingRecommendations))
    ];
}

/**
 * Create ActivityPub API handlers
 */
export function createActivityPubHandlers() {
    return [
        http.get('/activitypub/inbox/', () => HttpResponse.json(responseFixtures.activitypubInbox)),
        http.get('/activitypub/feed/', () => HttpResponse.json(responseFixtures.activitypubFeed))
    ];
}

/**
 * Helper functions for creating handlers
 */
export const get = (path: string, data: JsonValue) => http.get(path, () => HttpResponse.json(data));
export const post = (path: string, data: JsonValue, status = 201) => http.post(path, () => HttpResponse.json(data, {status}));
export const put = (path: string, data: JsonValue) => http.put(path, () => HttpResponse.json(data));
export const del = (path: string, data: JsonValue) => http.delete(path, () => HttpResponse.json(data));
export const patch = (path: string, data: JsonValue) => http.patch(path, () => HttpResponse.json(data));

/**
 * Create a dynamic handler that can process request data
 */
export function createDynamicHandler<P extends PathParams>(
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    path: string,
    handler: (context: {request: Request, params: P}) => Promise<JsonValue> | JsonValue
) {
    return http[method]<P>(path, async (info) => {
        const result = await handler(info);
        return HttpResponse.json(result);
    });
}

/**
 * Setup an MSW server for testing
 */
export function createServer() {
    // Create a server with default handlers
    const server = setupServer(
        ...createGhostAPIHandlers(),
        ...createActivityPubHandlers()
    );
    
    return server;
}

/**
 * Create a request configuration for the new MSW API
 */
export interface RequestConfig {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string | RegExp;
    response: JsonValue;
    status?: number;
}

/**
 * Create MSW handlers from request configurations
 */
export function createHandlersFromConfig(
    requests: Record<string, RequestConfig>,
    options: {useActivityPub?: boolean} = {}
) {
    return Object.entries(requests).map(([, config]) => {
        const {method, path, response, status} = config;
        const httpMethod = method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
        
        const apiPath = options?.useActivityPub 
            ? new RegExp(`/activitypub${typeof path === 'string' ? path : path.source}`)
            : new RegExp(`/ghost/api/admin${typeof path === 'string' ? path : path.source}`);
            
        return http[httpMethod](apiPath, () => {
            return HttpResponse.json(response, {status: status || (httpMethod === 'post' ? 201 : 200)});
        });
    });
}

/**
 * Initialize MSW in a Playwright browser context
 * 
 * This creates a simple mock implementation that can be used during tests
 * instead of requiring the actual MSW browser integration.
 */
export async function setupMSWBrowser(page: Page) {
    await page.addInitScript(() => {
        // Set up a simple mock implementation
        window.msw = {
            handlers: [],
            worker: {
                resetHandlers() {},
                use(...handlers: unknown[]) {
                    window.msw.handlers = handlers;
                }
            }
        };
    });
}

// Add window definition for TypeScript
declare global {
    interface Window {
        msw: {
            handlers: unknown[];
            worker: {
                resetHandlers: () => void;
                use: (...handlers: unknown[]) => void;
            };
        };
    }
}

/**
 * Create a default server instance for Node.js tests
 */
export const server = createServer();

/**
 * Helper function to set up MSW with route handlers for tests
 */
export function setupMSW() {
    // Start the MSW server
    server.listen({onUnhandledRequest: 'bypass'});
    
    return {
        // Clean up after each test
        teardown() {
            server.close();
        },
        
        // Reset handlers between tests
        resetHandlers() {
            server.resetHandlers();
        },
        
        // Add/override request handlers
        use(...handlers: Parameters<typeof server.use>) {
            server.use(...handlers);
        }
    };
} 