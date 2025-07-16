import {test, expect} from '@playwright/test';
import {withDataFactory} from '../../data-factory';
import {LoginPage, PostsPage} from '../../helpers/pages/admin';

test.describe('Posts Integration', () => {
    test('should create a post via data factory and verify it appears in posts list', async ({page}) => {
        // Step 1: Create a post using the data factory
        const timestamp = Date.now();
        const createdPost = await withDataFactory(async (factory) => {
            return await factory.createPost({
                title: `Test Post from Data Factory ${timestamp}`,
                status: 'published',
                featured: true,
                custom_excerpt: 'This post was created by our data factory for testing'
            });
        });
        
        console.log('Created post:', createdPost.title);
        
        // Step 2: Authenticate with Ghost admin using LoginPage
        const loginPage = new LoginPage(page);
        await loginPage.login('test+admin@test.com', 'P4ssw0rd123$');
        
        console.log('Login successful, current URL:', page.url());
        
        // Step 3: Navigate to posts list using PostsPage
        const postsPage = new PostsPage(page);
        await postsPage.goto();
        await postsPage.waitForPostsToLoad();
        
        // Step 4: Verify the post appears in the list
        const isVisible = await postsPage.isPostVisible(createdPost.title);
        
        // Assert the post is visible
        if (!isVisible) {
            console.log('Post not found, refreshing page...');
            await postsPage.refreshAndWait();
        }
        
        // Final assertion
        await expect(postsPage.findPostByTitle(createdPost.title)).resolves.not.toBeNull();
        
        console.log('✅ Post found on the page!');
    });
});