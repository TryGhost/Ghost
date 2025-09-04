import {test, expect} from '../helpers/fixtures/ghost-instance';
import {createPostFactory} from '../data-factory';
import type {PostFactory} from '../data-factory';

test.describe('Post Factory API Integration', () => {
    let postFactory: PostFactory;
    
    test.beforeEach(async ({page}) => {
        // Create post factory - page is already authenticated and configured
        postFactory = createPostFactory(page);
        page.setDefaultNavigationTimeout(30000);
    });
    
    test('should create a post and view it on the frontend', async ({page}) => {
        const post = await postFactory.create({
            title: 'Test Post from Factory',
            status: 'published'
        });
        
        expect(post.id).toBeTruthy();
        expect(post.slug).toBeTruthy();
        expect(post.status).toBe('published');
        
        // Navigate to the post - baseURL is automatically set to Ghost instance
        await page.goto(`/${post.slug}/`);
        await expect(page.locator('h1.gh-article-title')).toContainText('Test Post from Factory');
    });
    
    test('should create a post visible in Ghost Admin', async ({page}) => {
        const uniqueTitle = `Admin Test Post ${Date.now()}`;
        const post = await postFactory.create({
            title: uniqueTitle,
            status: 'published'
        });
        
        // Navigate to admin - baseURL is automatically set to Ghost instance
        await page.goto('/ghost/#/posts');
        await expect(page.locator(`text="${post.title}"`).first()).toBeVisible();
    });
    
    test('should create draft post that is not accessible on frontend', async ({page}) => {
        const draftPost = await postFactory.create({
            title: 'Draft Post from Factory',
            status: 'draft'
        });
        
        expect(draftPost.status).toBe('draft');
        expect(draftPost.published_at).toBeNull();
        
        // Navigate to draft post - should return 404
        const response = await page.goto(`/${draftPost.slug}/`, {
            waitUntil: 'domcontentloaded'
        });
        expect(response?.status()).toBe(404);
    });
});