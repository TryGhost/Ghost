import {createMethodHandler, createResponseResolver} from './core';

// Types from acceptance.ts
interface MockRequestConfig {
    method: string;
    path: string | RegExp;
    response: unknown;
    responseStatus?: number;
    responseHeaders?: {[key: string]: string};
}

/**
 * Converts a mock request config to MSW handler
 */
export function createHandlerFromMockConfig(requestConfig: MockRequestConfig & { name?: string }) {
    const {method, path, response, responseStatus = 200, responseHeaders = {}} = requestConfig;
    
    // For path patterns, we need to convert the string or regex to the appropriate format for MSW
    let pathPattern: string | RegExp;
    
    // Handle paths differently based on type
    if (typeof path === 'string') {
        // MSW doesn't need the API path prefix when hosted on the same origin
        // Use literal string (not RegExp) to preserve query parameters
        pathPattern = path.startsWith('/ghost/api/admin') ? path : `/ghost/api/admin${path}`;
        
        // In MSW v2, query parameters in string paths need special handling
        // This approach keeps the original functionality intact
        if (pathPattern.includes('?')) {
            // Extract the base path and create a regex that matches regardless of query param order
            const basePath = pathPattern.split('?')[0];
            const queryParts = pathPattern.split('?')[1].split('&');
            
            // Create a regex that matches the path with any order of query parameters
            const queryRegexParts = queryParts.map((part) => {
                const [key, value] = part.split('=');
                if (value) {
                    return `(?=.*[?&]${key}=${encodeURIComponent(value).replace(/%/g, '%25')}(?:&|$))`;
                }
                return `(?=.*[?&]${key}(?:=|&|$))`;
            });
            
            pathPattern = new RegExp(`^${basePath}\\?${queryRegexParts.join('')}.*$`);
        }
    } else {
        // For RegExp paths, preserve the pattern
        pathPattern = path;
    }
    
    // Create response resolver using the shared function
    const responseResolver = createResponseResolver(response, {
        status: responseStatus,
        headers: responseHeaders
    });
    
    // Create the handler using the shared method handler function
    return createMethodHandler(method, pathPattern, responseResolver);
}

/**
 * Creates MSW handlers from a mock API configuration object
 */
export function createHandlersFromMockApi<Requests extends Record<string, MockRequestConfig>>(requests: Requests) {
    return Object.entries(requests).map(
        ([name, config]) => createHandlerFromMockConfig({name, ...config})
    );
}

/**
 * Convert the limit requests to MSW handlers
 */
export function createLimitRequestHandlers(limitRequests: Record<string, MockRequestConfig>) {
    return createHandlersFromMockApi(limitRequests);
} 