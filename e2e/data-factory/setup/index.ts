import {PostFactory} from '../factories/posts/post-factory';
import {TagFactory} from '../factories/tags/tag-factory';
import {GhostAdminApiAdapter} from '../persistence/adapters/ghost-api';
import {Page} from '@playwright/test';

/**
 * Create a new PostFactory with API persistence
 * Uses the page.request context which already has the proper
 * storageState and baseURL configured for the current test worker
 * 
 * @param page - The Playwright page object from the test
 * @returns PostFactory ready to use with the specified Ghost backend
 */
export function createPostFactory(page: Page): PostFactory {
    const adapter = new GhostAdminApiAdapter(
        page.request,
        'posts',
        {formats: 'mobiledoc,lexical,html'}
    );
    return new PostFactory(adapter);
}

export function createTagFactory(page: Page): TagFactory {
    const adapter = new GhostAdminApiAdapter(
        page.request,
        'tags'
    );
    return new TagFactory(adapter);
}
