import {test, expect} from '@playwright/test';
import {createPostFactory} from '../data-factory';
import type {PostFactory} from '../data-factory';

test.describe('Post Factory API Integration', () => {
    let postFactory: PostFactory;
    
    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page);
    });
    
    test('should create a post and view it on the frontend', async ({page}) => {
        const post = await postFactory.create({
            title: 'Test Post from Factory',
            status: 'published'
        });
        
        expect(post.id).toBeTruthy();
        expect(post.slug).toBeTruthy();
        expect(post.status).toBe('published');
        
        // TODO: Replace this with a Post page object
        await page.goto(`http://localhost:2368/${post.slug}/`);
        await expect(page.locator('h1.gh-article-title')).toContainText('Test Post from Factory');
    });
    
    test('should create a post visible in Ghost Admin', async ({page}) => {
        const uniqueTitle = `Admin Test Post ${Date.now()}`;
        const post = await postFactory.create({
            title: uniqueTitle,
            status: 'published'
        });
        
        // TODO: Replace with PostsList page object
        await page.goto('http://localhost:2368/ghost/#/posts');
        await expect(page.locator(`text="${post.title}"`).first()).toBeVisible();
    });
    
    test('should create draft post that is not accessible on frontend', async ({page}) => {
        const draftPost = await postFactory.create({
            title: 'Draft Post from Factory',
            status: 'draft'
        });
        
        expect(draftPost.status).toBe('draft');
        expect(draftPost.published_at).toBeNull();
        
        // TODO: Replace this with a 404 page object
        const response = await page.goto(`http://localhost:2368/${draftPost.slug}/`, {
            waitUntil: 'domcontentloaded'
        });
        expect(response?.status()).toBe(404);
    });
});