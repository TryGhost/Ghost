import {PostFactory} from '../factories/posts/post-factory';
import {SettingsFactory} from '../factories/settings-factory';
import {GhostAdminApiAdapter} from '../persistence/adapters/ghost-api';
import {GhostSettingsApiAdapter} from '../persistence/adapters/ghost-settings-api';
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

/**
 * Create a new SettingsFactory with API persistence
 * Uses the page.request context which already has the proper
 * storageState and baseURL configured for the current test worker
 *
 * @param page - The Playwright page object from the test
 * @returns SettingsFactory ready to use with the specified Ghost backend
 */
export function createSettingsFactory(page: Page): SettingsFactory {
    const adapter = new GhostSettingsApiAdapter(page.request);
    return new SettingsFactory(adapter);
}