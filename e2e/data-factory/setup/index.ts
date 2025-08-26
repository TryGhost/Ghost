import {PostFactory} from '../factories/posts/post-factory';
import {GhostApiAdapter} from '../persistence/adapters/ghost-api';
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
    // Pass page.context() which contains both browser state and API request context
    // The adapter will use context.request for API calls while maintaining auth state
    const adapter = new GhostApiAdapter(page.context(), 'posts');
    return new PostFactory(adapter);
}