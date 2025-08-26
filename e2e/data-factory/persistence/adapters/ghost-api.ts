import {ApiPersistenceAdapter} from './api';
import type {BrowserContext} from '@playwright/test';

/**
 * Ghost Admin API adapter that handles Ghost's API formatting conventions
 * All Ghost Admin API endpoints follow the pattern:
 * - Endpoint: /ghost/api/admin/{resource}
 * - Request wrapper: { [resource]: [data] }
 * - Response extractor: response[resource][0]
 */
export class GhostAdminApiAdapter extends ApiPersistenceAdapter {
    constructor(context: BrowserContext, resourcePath: string, queryParams?: Record<string, string>) {
        // Extract the resource name from the path (e.g., 'posts' from 'posts' or 'posts/1234')
        const resource = resourcePath.split('/')[0];
        
        super({
            context,
            endpoint: `/ghost/api/admin/${resourcePath}`,
            queryParams: queryParams || {},
            wrapRequest: data => ({[resource]: [data]}),
            extractResponse: (response: any) => {
                const items = response[resource];
                return Array.isArray(items) ? items[0] : response;
            }
        });
    }
}