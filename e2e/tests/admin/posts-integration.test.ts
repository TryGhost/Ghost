import {test} from '@playwright/test';
import {createPublishedPost, clearCreatedPosts} from '../../data-factory';
import {LoginPage, PostsPage} from '../../helpers/pages/admin';

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
        const loginPage = new LoginPage(page);
        await loginPage.login('test+admin@test.com', 'P4ssw0rd123$');
        
        // Navigate to posts page
        const postsPage = new PostsPage(page);
        await postsPage.goto();
        
        // Assert post is present using composable page object method
        await postsPage.assertPostExists(post.title);
    });
});