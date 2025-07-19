import {test, expect} from '@playwright/test';
import {withDataFactory} from '../index';

test.describe('Tinybird Factory', () => {
    test('can create a page hit', async () => {
        // Wait for Ghost to be fully booted before using Tinybird
        await withDataFactory(async (factory) => {
            // Create a page hit
            const hit = await factory.createPageHit({
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
        }, {waitForGhostBoot: true});
    });
    
    test('can create multiple page hits', async () => {
        await withDataFactory(async (factory) => {
            // Create multiple page hits
            const hits = await factory.createPageHits(5, {
                pathname: '/about/',
                member_status: 'paid'
            });
            
            expect(hits).toHaveLength(5);
            hits.forEach((hit) => {
                expect(hit.payload.pathname).toBe('/about/');
                expect(hit.payload.member_status).toBe('paid');
            });
        }, {waitForGhostBoot: true});
    });
    
    test('can create page hits linked to posts', async () => {
        await withDataFactory(async (factory) => {
            // First create a post
            const post = await factory.createPost({
                title: 'Test Analytics Post',
                status: 'published'
            });
            
            // Then create a page hit for that post
            const hit = await factory.createPageHit({
                pathname: `/blog/${post.slug}/`,
                post_uuid: post.uuid,
                member_status: 'free'
            });
            
            expect(hit.payload.post_uuid).toBe(post.uuid);
            expect(hit.payload.pathname).toContain(post.slug);
        }, {waitForGhostBoot: true});
    });
    
    test('throws error when Ghost is not booted and Tinybird is used', async () => {
        // Test without waitForGhostBoot to ensure proper error handling
        await expect(
            withDataFactory(async (factory) => {
                await factory.createPageHit();
            })
        ).rejects.toThrow('TinybirdFactory not initialized');
    });
});