// This file exports testing utilities for MSW that can be used in tests

import {HttpResponse, http} from 'msw';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {limitRequests, responseFixtures} from './test/acceptance';
import {server} from './test/msw/node';

// Create a configured QueryClient for testing
export const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false
        }
    }
});

// Create MSW handlers from mock API requests
export function createMswHandlers(mockRequests: Record<string, {
    method: string;
    path: string | RegExp;
    response: unknown;
    responseStatus?: number;
    responseHeaders?: Record<string, string>;
}>) {
    return Object.entries(mockRequests).map(([, config]) => {
        const {method, path: pathPattern, response, responseStatus = 200, responseHeaders = {}} = config;
        
        const responseResolver = async () => {
            return HttpResponse.json(
                response as Record<string, unknown>,
                {
                    status: responseStatus,
                    headers: responseHeaders
                }
            );
        };
        
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
    });
}

// Export everything needed for testing
export {
    HttpResponse,
    http,
    server,
    responseFixtures,
    limitRequests,
    QueryClientProvider
}; 