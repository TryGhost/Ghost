import {test, expect} from '@playwright/test';
import {createPageHit, createPageHits, createPost, clearCreatedPosts} from '../index';

test.describe('Tinybird Factory', () => {
    test.afterEach(async () => {
        // Clean up any posts created
        await clearCreatedPosts();
    });
    
    test('can create a page hit', async () => {
        // Create a page hit
        const hit = await createPageHit({
            pathname: '/blog/my-first-post/',
            referrer: 'https://www.google.com/',
            member_status: 'free'
        });
        
        expect(hit.action).toBe('page_hit');
        expect(hit.version).toBe('1');
        expect(hit.payload.pathname).toBe('/blog/my-first-post/');
        expect(hit.payload.referrer).toBe('https://www.google.com/');
        expect(hit.payload.member_status).toBe('free');
        expect(hit.payload.meta.referrerSource).toBe('Google');
        expect(hit.payload.site_uuid).toBeTruthy();
    });
    
    test('can create multiple page hits', async () => {
        // Create multiple page hits
        const hits = await createPageHits(5, {
            pathname: '/about/',
            member_status: 'paid'
        });
        
        expect(hits).toHaveLength(5);
        hits.forEach((hit) => {
            expect(hit.payload.pathname).toBe('/about/');
            expect(hit.payload.member_status).toBe('paid');
        });
    });
    
    test('can create page hits linked to posts', async () => {
        // First create a post with unique title
        const post = await createPost({
            title: `Analytics Post ${Date.now()}`,
            status: 'published'
        });
        
        // Then create a page hit for that post
        const hit = await createPageHit({
            pathname: `/blog/${post.slug}/`,
            post_uuid: post.uuid,
            member_status: 'free'
        });
        
        expect(hit.payload.post_uuid).toBe(post.uuid);
        expect(hit.payload.pathname).toContain(post.slug);
    });
    
    test.skip('throws error when Ghost is not booted and Tinybird is used', async () => {
        // This test is skipped because the new API automatically ensures Ghost is booted
        // The error condition can no longer be easily triggered
    });
});