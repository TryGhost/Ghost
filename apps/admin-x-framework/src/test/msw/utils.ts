import {HttpResponse, HttpResponseResolver, PathParams, http} from 'msw';

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
    let pathPattern: string | RegExp = path;
    
    // If path is a RegExp, use it directly
    // If path is a string, use it directly but remove leading API path if needed
    if (typeof path === 'string') {
        // MSW doesn't need the API path prefix when hosted on the same origin
        pathPattern = path.startsWith('/ghost/api/admin') ? path : `/ghost/api/admin${path}`;
    }
    
    // Function to generate the response resolver
    const responseResolver: HttpResponseResolver<PathParams> = async () => {
        return HttpResponse.json(
            response as Record<string, unknown>,
            {
                status: responseStatus,
                headers: responseHeaders
            }
        );
    };
    
    // Create the appropriate HTTP method handler
    switch (method.toUpperCase()) {
    case 'GET':
        return http.get(pathPattern, responseResolver);
    case 'POST':
        return http.post(pathPattern, responseResolver);
    case 'PUT':
        return http.put(pathPattern, responseResolver);
    case 'DELETE':
        return http.delete(pathPattern, responseResolver);
    case 'PATCH':
        return http.patch(pathPattern, responseResolver);
    default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
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