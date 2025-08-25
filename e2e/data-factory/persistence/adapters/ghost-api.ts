import {ApiPersistenceAdapter} from './api';
import type {GhostApiClient} from '../../utils/api-client';

// Type for the data being sent/received
type EntityData = Record<string, unknown>;

// Type for Ghost API responses
interface GhostApiResponse {
    posts?: EntityData[];
    pages?: EntityData[];
    members?: EntityData[];
}

/**
 * Ghost-specific API adapter that handles Ghost's API formatting requirements
 */
export class GhostApiAdapter extends ApiPersistenceAdapter {
    constructor(agent: GhostApiClient, entityType: 'posts' | 'pages' | 'members') {
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
            },
            pages: {
                endpoint: '/ghost/api/admin/pages?formats=mobiledoc,lexical,html',
                wrapRequest: (data: EntityData) => ({pages: [data]}),
                extractResponse: (response: GhostApiResponse) => {
                    if (response.pages && Array.isArray(response.pages)) {
                        return response.pages[0];
                    }
                    return response;
                }
            },
            members: {
                endpoint: '/ghost/api/admin/members',
                wrapRequest: (data: EntityData) => ({members: [data]}),
                extractResponse: (response: GhostApiResponse) => {
                    if (response.members && Array.isArray(response.members)) {
                        return response.members[0];
                    }
                    return response;
                }
            }
        };

        const config = configs[entityType];
        super({
            agent,
            endpoint: config.endpoint,
            wrapRequest: config.wrapRequest,
            extractResponse: config.extractResponse
        });
    }
}