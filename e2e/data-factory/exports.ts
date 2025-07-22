import {TinybirdFactory} from './factories/tinybird-factory';
import {setupTestFactory} from './setup';
import type {PostOptions, PostResult} from './types';
import type {PageHitOptions, PageHitResult} from './factories/tinybird-factory';
import type {Factories} from './setup';

// Re-export setupTestFactory for convenience
export {setupTestFactory} from './setup';

/**
 * Direct method to create a post without the wrapper
 */
export async function createPost(options?: PostOptions): Promise<PostResult> {
    const factories = await setupTestFactory();
    return factories.ghost.createPost(options);
}

/**
 * Helper to create a published post with sensible defaults
 */
export async function createPublishedPost(options?: PostOptions): Promise<PostResult> {
    return createPost({
        status: 'published',
        ...options
    });
}

// Helper function to get Tinybird factory with better error handling
async function getTinybirdFactory(): Promise<TinybirdFactory> {
    const factories = await setupTestFactory();
    if (!factories.tinybird) {
        throw new Error('Tinybird is not available. Ensure Ghost is properly booted with a site_uuid.');
    }
    return factories.tinybird;
}

/**
 * Direct method to create a page hit
 */
export async function createPageHit(options?: PageHitOptions): Promise<PageHitResult> {
    const tinybird = await getTinybirdFactory();
    return tinybird.createPageHit(options);
}

/**
 * Direct method to create multiple page hits
 */
export async function createPageHits(count: number, options?: PageHitOptions): Promise<PageHitResult[]> {
    const tinybird = await getTinybirdFactory();
    return tinybird.createPageHits(count, options);
}

/**
 * Get direct access to the underlying factories for advanced use cases
 */
export async function getFactories(options?: {waitForGhostBoot?: boolean}): Promise<Factories> {
    return setupTestFactory(options);
}

/**
 * Clear all posts created by the factory in this session
 */
export async function clearCreatedPosts(): Promise<void> {
    const factories = await setupTestFactory();
    await factories.ghost.clearCreatedPosts();
}

/**
 * Clear all page hits from Tinybird (WARNING: This truncates the entire datasource)
 */
export async function clearAllPageHits(): Promise<void> {
    const factories = await setupTestFactory();
    if (factories.tinybird) {
        await factories.tinybird.clearAllPageHits();
    }
}