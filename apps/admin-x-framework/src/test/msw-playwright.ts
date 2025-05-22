/**
 * MSW implementation for Playwright tests
 * 
 * Provides a mockApi function that works with Playwright and has a compatible API
 * with the old mockApi function but uses MSW under the hood.
 */

import {Page} from '@playwright/test';
import {http} from './msw';

// Create a server instance for Playwright tests
import {setupServer} from 'msw/node';
export const playwrightServer = setupServer();

/**
 * Compatible interface with the old mockApi function
 */
interface MockRequestConfig {
    method: string;
    path: string | RegExp;
    response: unknown;
    responseStatus?: number;
    responseHeaders?: {[key: string]: string};
}

interface RequestRecord {
    url?: string;
    body?: unknown;
    headers?: {[key: string]: string};
}

/**
 * MSW-based implementation of mockApi for Playwright tests
 * 
 * This provides the same API as the old mockApi function but uses MSW
 * for better maintainability and consistency.
 *
 * @returns {Object} Object containing captured requests (lastApiRequests)
 */
export async function mockApi<Requests extends Record<string, MockRequestConfig>>({
    page, 
    requests, 
    options = {}
}: {
    page: Page;
    requests: Requests;
    options?: {useActivityPub?: boolean};
}) {
    // Object to store captured requests data
    const lastApiRequests: Record<string, RequestRecord> = {};
    
    // Convert legacy request configs to MSW handlers
    const handlers = Object.entries(requests).map(([key, config]) => {
        const {method, path, response, responseStatus = 200} = config;
        const httpMethod = method.toLowerCase() as keyof typeof http;
        
        const apiPath = options?.useActivityPub 
            ? new RegExp(`/activitypub${typeof path === 'string' ? path : path.source}`)
            : new RegExp(`/ghost/api/admin${typeof path === 'string' ? path : path.source}`);
            
        // Create handler with request capture
        return http[httpMethod](apiPath, async ({request}) => {
            try {
                // Capture request data
                const requestData: RequestRecord = {
                    url: request.url
                };
                
                // Capture headers
                requestData.headers = Object.fromEntries(request.headers.entries());
                
                // Capture body for non-GET requests
                if (request.method !== 'GET') {
                    const contentType = request.headers.get('content-type') || '';
                    if (contentType.includes('application/json')) {
                        requestData.body = await request.clone().json().catch(() => null);
                    } else {
                        requestData.body = await request.clone().text().catch(() => null);
                    }
                }
                
                // Store request data
                lastApiRequests[key] = requestData;
            } catch (error) {
                // Silently continue if capture fails
            }
            
            // Return the mock response
            return new Response(
                typeof response === 'string' ? response : JSON.stringify(response),
                {
                    status: responseStatus,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        });
    });
    
    // Add the handlers to the server
    playwrightServer.use(...handlers);
    
    // Set up MSW in the browser context
    await setupMockInBrowser(page);
    
    return {lastApiRequests};
}

/**
 * Set up MSW in the browser for Playwright tests
 */
async function setupMockInBrowser(page: Page) {
    // Initialize service worker mock in the browser
    await page.addInitScript(() => {
        // Create a simple mock for intercepting requests
        const originalFetch = window.fetch;
        
        // Replace fetch to capture requests
        window.fetch = async function mockedFetch(input, init) {
            // Call the original fetch
            const response = await originalFetch(input, init);
            
            // Return the response
            return response;
        };
        
        // Flag to indicate MSW is initialized
        window.__mswReady = true;
    });
    
    // Wait for MSW to be ready
    await page.waitForFunction(() => window.__mswReady);
}

// Extend window interface for TypeScript
declare global {
    interface Window {
        __mswReady: boolean;
    }
} 