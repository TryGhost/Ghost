/**
 * Core utility functions for MSW handler creation
 * 
 * This file contains shared logic for creating MSW handlers
 * to avoid duplication in utils.ts and msw.ts
 */

import {HttpResponse, HttpResponseResolver, PathParams, http} from 'msw';

/**
 * Base interface for request configurations
 */
export interface BaseRequestConfig {
    method: string;
    path: string | RegExp;
    response: unknown;
}

/**
 * Core function to create an HTTP method handler with response
 * 
 * This function handles the core logic of mapping HTTP methods to handlers
 * and creating response resolvers.
 */
export function createMethodHandler(
    method: string,
    path: string | RegExp,
    responseResolver: HttpResponseResolver<PathParams>
) {
    // Map method to the appropriate HTTP handler
    switch (method.toUpperCase()) {
    case 'GET':
        return http.get(path, responseResolver);
    case 'POST':
        return http.post(path, responseResolver);
    case 'PUT':
        return http.put(path, responseResolver);
    case 'DELETE':
        return http.delete(path, responseResolver);
    case 'PATCH':
        return http.patch(path, responseResolver);
    default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
}

/**
 * Create a response resolver function for a request
 */
export function createResponseResolver(
    response: unknown,
    options: {
        status?: number;
        headers?: Record<string, string>;
    } = {}
): HttpResponseResolver<PathParams> {
    const {status = 200, headers = {}} = options;
    
    return async () => {
        return HttpResponse.json(
            response as Record<string, unknown>,
            {
                status,
                headers
            }
        );
    };
}

/**
 * Utility to get default status code based on HTTP method
 */
export function getDefaultStatus(method: string): number {
    return method.toUpperCase() === 'POST' ? 201 : 200;
} 