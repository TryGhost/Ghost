/**
 * MSW implementation for Playwright tests
 * 
 * Provides a mockApi function that works with Playwright and has a compatible API
 * with the old mockApi function but uses MSW under the hood.
 */

import {Page} from '@playwright/test';
import {DefaultBodyType, HttpResponse, PathParams} from 'msw';
import {createMethodHandler} from './msw/core';

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
        
        // Determine the base API path prefix
        const base = options?.useActivityPub ? '/activitypub' : '/ghost/api/admin';
        
        // Handle paths differently based on type
        let apiPath: string | RegExp;
        
        if (typeof path === 'string') {
            // For string paths, use literal string (no RegExp) to preserve query parameters
            apiPath = `${base}${path}`;
            
            // In MSW v2, query parameters in string paths need special handling
            if (apiPath.includes('?')) {
                // Extract the base path and create a regex that matches regardless of query param order
                const basePath = apiPath.split('?')[0];
                const queryParts = apiPath.split('?')[1].split('&');
                
                // Create a regex that matches the path with any order of query parameters
                const queryRegexParts = queryParts.map(part => {
                    const [key, value] = part.split('=');
                    if (value) {
                        return `(?=.*[?&]${key}=${encodeURIComponent(value).replace(/%/g, '%25')}(?:&|$))`;
                    }
                    return `(?=.*[?&]${key}(?:=|&|$))`;
                });
                
                apiPath = new RegExp(`^${basePath}\\?${queryRegexParts.join('')}.*$`);
            }
        } else {
            // For RegExp paths, preserve the regex pattern
            apiPath = new RegExp(`${base}${path.source}`);
        }
            
        // Create a custom response resolver with request capture
        const responseResolver = async ({request}: {request: Request, params: PathParams}) => {
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
            return HttpResponse.json(
                response as DefaultBodyType,
                {
                    status: responseStatus,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        };
        
        // Use shared createMethodHandler function
        return createMethodHandler(method, apiPath, responseResolver);
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