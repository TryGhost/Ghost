import {ApiPersistenceAdapter} from './api';
import type {BrowserContext} from '@playwright/test';

// Type for the data being sent/received
type EntityData = Record<string, unknown>;

// Type for Ghost API responses
interface GhostApiResponse {
    posts?: EntityData[];
}

/**
 * Ghost-specific API adapter that handles Ghost's API formatting requirements
 * Extends the generic API adapter with Ghost-specific configuration
 */
export class GhostApiAdapter extends ApiPersistenceAdapter<EntityData, GhostApiResponse> {
    constructor(context: BrowserContext, entityType: 'posts') {
        const configs = {
            posts: {
                endpoint: '/ghost/api/admin/posts?formats=mobiledoc,lexical,html',
                wrapRequest: (data: EntityData) => ({posts: [data]}),
                extractResponse: (response: GhostApiResponse) => {
                    if (response.posts && Array.isArray(response.posts)) {
                        return response.posts[0];
                    }
                    return response;
                }
            }
        };

        const config = configs[entityType];
        super({
            context,
            endpoint: config.endpoint,
            wrapRequest: config.wrapRequest,
            extractResponse: config.extractResponse
        });
    }
}