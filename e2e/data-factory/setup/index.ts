import {PostFactory} from '../factories/posts/post-factory';
import {GhostApiAdapter} from '../persistence/adapters/ghost-api';
import {GhostApiClient} from '../utils/api-client';
import {appConfig} from '../../helpers/utils/app-config';

interface FactoryOptions {
    baseURL?: string;
    email?: string;
    password?: string;
}

/**
 * Create a new PostFactory with API persistence
 * Each factory gets its own authenticated client for test isolation
 * 
 * @param options - Optional overrides for Ghost instance and credentials
 * @returns PostFactory ready to use with the specified Ghost backend
 */
export async function createPostFactory(options?: FactoryOptions): Promise<PostFactory> {
    const {
        baseURL = appConfig.baseURL,
        email = appConfig.auth.email,
        password = appConfig.auth.password
    } = options || {};
    
    // Create a new client for this factory instance
    const client = new GhostApiClient(baseURL);
    await client.authenticate(email, password);
    
    const adapter = new GhostApiAdapter(client, 'posts');
    return new PostFactory(adapter);
}