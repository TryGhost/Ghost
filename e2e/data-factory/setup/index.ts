import {PostFactory} from '../factories/posts/post-factory';
import {GhostApiAdapter} from '../persistence/adapters/ghost-api';
import {appConfig} from '../../helpers/utils/app-config';
import {APIRequestContext, request} from '@playwright/test';

interface FactoryOptions {
    baseURL?: string;
    context?: APIRequestContext;
}

/**
 * Create a new PostFactory with API persistence
 * Uses existing Playwright authentication from setup phase
 * 
 * @param options - Optional overrides for Ghost instance and API context
 * @returns PostFactory ready to use with the specified Ghost backend
 */
export async function createPostFactory(options?: FactoryOptions): Promise<PostFactory> {
    const baseURL = options?.baseURL || appConfig.baseURL;
    
    // Create context with stored auth state from Playwright setup
    const context = options?.context || await request.newContext({
        baseURL,
        storageState: appConfig.auth.storageFile
    });
    
    const adapter = new GhostApiAdapter(context, 'posts');
    return new PostFactory(adapter);
}