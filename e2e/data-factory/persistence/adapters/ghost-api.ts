import {ApiPersistenceAdapter} from './api';
import {HttpClient} from './http-client';

type GhostApiResponse = {
    [key: string]: unknown[] | unknown;
};

/**
 * Ghost Admin API adapter that handles Ghost's API formatting conventions
 * All Ghost Admin API endpoints follow the pattern:
 * - Endpoint: /ghost/api/admin/{resource}
 * - Request transformation: { [resource]: [data] }
 * - Response transformation: response[resource][0]
 */
export class GhostAdminApiAdapter extends ApiPersistenceAdapter<unknown, GhostApiResponse> {
    constructor(httpClient: HttpClient, resourcePath: string, queryParams?: Record<string, string>) {
        // Extract the resource name from the path (e.g., 'posts' from 'posts' or 'posts/1234')
        const resource = resourcePath.split('/')[0];

        super({
            httpClient,
            endpoint: `/ghost/api/admin/${resourcePath}`,
            queryParams: queryParams || {},
            transformRequest: data => ({[resource]: [data]}),
            transformResponse: (response: GhostApiResponse) => {
                const items = response[resource];
                return Array.isArray(items) ? items[0] : response;
            }
        });
    }
}
