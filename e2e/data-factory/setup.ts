import {GhostAdminApiAdapter} from './persistence/adapters/ghost-api';
import {HttpClient} from './persistence/adapters/http-client';
import {PostFactory} from './factories/post-factory';
import {TagFactory} from './factories/tag-factory';

/**
 * Create a new PostFactory with API persistence
 * Uses the http client which already has the proper authentication headers and baseURL
 * configured (this would be Playwright's page.request)
 *
 * @param httpClient - client for requests with pre-defined authorization and base url
 * @returns PostFactory ready to use with the specified Ghost backend
 */
export function createPostFactory(httpClient: HttpClient): PostFactory {
    const adapter = new GhostAdminApiAdapter(
        httpClient,
        'posts',
        {formats: 'mobiledoc,lexical,html'}
    );
    return new PostFactory(adapter);
}

export function createTagFactory(httpClient: HttpClient): TagFactory {
    const adapter = new GhostAdminApiAdapter(
        httpClient,
        'tags'
    );
    return new TagFactory(adapter);
}

