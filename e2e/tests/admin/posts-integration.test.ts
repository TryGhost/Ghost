import {test} from '@playwright/test';
import {createPublishedPost, clearCreatedPosts} from '../../data-factory';
import {loginAsAdmin, gotoPosts} from '../../helpers';

test.describe('Posts Integration', () => {
    test.afterEach(async () => {
        // Simple cleanup - just one line!
        await clearCreatedPosts();
    });
    
    test('should create a post via data factory and verify it appears in posts list', async ({page}) => {
        // Create a published post with a unique title
        const timestamp = Date.now();
        const post = await createPublishedPost({
            title: `Test Post ${timestamp}`,
            featured: true,
            custom_excerpt: 'This post was created by our data factory for testing'
        });
        
        // Login to Ghost admin
        await loginAsAdmin(page);
        
        // Navigate to posts page and assert post exists
        const postsPage = await gotoPosts(page);
        await postsPage.assertPostExists(post.title);
    });
});