import {test, expect} from '@playwright/test';
import {createPostFactory} from '../data-factory';

test.describe('Post Factory API Integration', () => {
    test('should create a post via API and view it on the frontend', async ({page}) => {
        // Create a post using the factory
        const postFactory = await createPostFactory();
        
        // Use a unique slug to avoid conflicts
        const uniqueSlug = `test-post-factory-${Date.now()}`;
        
        // Create lexical content for the post
        const lexicalContent = JSON.stringify({
            root: {
                children: [{
                    children: [{
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text: 'This post was created using the Post Factory with API persistence.',
                        type: 'text',
                        version: 1
                    }],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'paragraph',
                    version: 1
                }],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        });
        
        const post = await postFactory.create({
            title: 'Test Post from Factory',
            slug: uniqueSlug,
            status: 'published',
            lexical: lexicalContent,
            mobiledoc: undefined,
            published_at: new Date()
        });
        
        // Verify the post was created
        expect(post.id).toBeTruthy();
        expect(post.slug).toBe(uniqueSlug);
        expect(post.status).toBe('published');
        
        
        // Visit the post on the Ghost frontend
        await page.goto(`http://localhost:2368/${post.slug}/`);
        
        // Verify the post is visible on the frontend
        await expect(page.locator('h1.gh-article-title')).toContainText('Test Post from Factory');
        await expect(page.locator('.gh-content')).toContainText('This post was created using the Post Factory');
        
        // Check that the post URL is correct
        expect(page.url()).toContain(`/${post.slug}/`);
    });
    
    test('should create multiple posts with unique slugs', async () => {
        const postFactory = await createPostFactory();
        
        // Create multiple posts
        const posts = [];
        for (let i = 1; i <= 3; i++) {
            const post = await postFactory.create({
                title: `Factory Post ${i}`,
                status: 'published',
                published_at: new Date()
            });
            posts.push(post);
        }
        
        // Verify all posts were created with unique IDs and slugs
        expect(posts).toHaveLength(3);
        
        const ids = posts.map(p => p.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(3);
        
        const slugs = posts.map(p => p.slug);
        const uniqueSlugs = new Set(slugs);
        expect(uniqueSlugs.size).toBe(3);
    });
    
    test('should create draft post that is not accessible on frontend', async ({page}) => {
        const postFactory = await createPostFactory();
        
        // Create a draft post
        const draftPost = await postFactory.create({
            title: 'Draft Post from Factory',
            slug: 'draft-post-factory',
            status: 'draft',
            html: '<p>This is a draft post.</p>'
        });
        
        expect(draftPost.status).toBe('draft');
        expect(draftPost.published_at).toBeNull();
        
        // Try to visit the draft post - should get 404
        const response = await page.goto(`http://localhost:2368/${draftPost.slug}/`, {
            waitUntil: 'domcontentloaded'
        });
        
        // Draft posts should return 404
        expect(response?.status()).toBe(404);
    });
});