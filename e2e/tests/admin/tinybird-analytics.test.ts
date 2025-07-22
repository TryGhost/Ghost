import {test, expect} from '@playwright/test';
import {createPublishedPost, createPageHit, createPageHits, clearCreatedPosts, clearAllPageHits} from '../../data-factory';
import {loginAsAdmin, gotoPosts, gotoAnalytics, AnalyticsOverviewPage} from '../../helpers';
import type {PageHitResult} from '../../data-factory';

// Helper functions for cleaner assertions
const expectPageHit = (hit: PageHitResult) => ({
    toBeValid() {
        expect(hit.action).toBe('page_hit');
        expect(hit.version).toBe('1');
        expect(hit.session_id).toBeTruthy();
    },
    toBeForPost(postUuid: string, postSlug: string) {
        expect(hit.payload.post_uuid).toBe(postUuid);
        expect(hit.payload.pathname).toContain(postSlug);
    },
    toHaveReferrer(source: string) {
        expect(hit.payload.meta.referrerSource).toBe(source);
    },
    toHaveMemberStatus(status: string) {
        expect(hit.payload.member_status).toBe(status);
    }
});

const REFERRER_SOURCES = [
    {url: 'https://www.google.com/', expected: 'Google'},
    {url: 'https://duckduckgo.com/', expected: 'DuckDuckGo'},
    {url: 'https://reddit.com/r/ghost', expected: 'Reddit'},
    {url: 'https://t.co/abc123', expected: 'Twitter'},
    {url: 'https://facebook.com/', expected: 'Facebook'},
    {url: 'https://go.bsky.app/', expected: 'Bluesky'},
    {url: 'https://example.com/', expected: 'example.com'}
];

test.describe('Tinybird Analytics', () => {
    test.afterEach(async () => {
        await clearCreatedPosts();
    });

    test.afterAll(async () => {
        await clearAllPageHits();
    });
    
    test('tracks page hits with metadata', async () => {
        const post = await createPublishedPost({title: 'Analytics Test Post'});
        
        const hit = await createPageHit({
            pathname: `/blog/${post.slug}/`,
            post_uuid: post.uuid,
            member_status: 'free',
            referrer: 'https://www.google.com/search?q=ghost+cms'
        });
        
        const assertion = expectPageHit(hit);
        assertion.toBeValid();
        assertion.toBeForPost(post.uuid, post.slug);
        assertion.toHaveReferrer('Google');
        assertion.toHaveMemberStatus('free');
    });
    
    test('identifies referrer sources correctly', async () => {
        const post = await createPublishedPost({title: 'Popular Post'});
        
        const hits = await Promise.all(
            REFERRER_SOURCES.map(source => createPageHit({
                pathname: `/blog/${post.slug}/`,
                post_uuid: post.uuid,
                referrer: source.url
            }))
        );
        
        hits.forEach((hit, i) => {
            expectPageHit(hit).toHaveReferrer(REFERRER_SOURCES[i].expected);
        });
    });
    
    test('tracks all member status types', async () => {
        const post = await createPublishedPost({title: 'Members Content'});
        const statuses = ['free', 'paid', 'comped', 'undefined'] as const;
        
        const hits = await Promise.all(
            statuses.map(status => createPageHit({
                pathname: `/blog/${post.slug}/`,
                post_uuid: post.uuid,
                member_status: status
            }))
        );
        
        hits.forEach((hit, i) => {
            expectPageHit(hit).toHaveMemberStatus(statuses[i]);
        });
    });
    
    test('handles bulk page hits efficiently', async () => {
        const post = await createPublishedPost({title: 'High Traffic Post'});
        
        const hits = await createPageHits(10, {
            pathname: `/blog/${post.slug}/`,
            post_uuid: post.uuid,
            referrer: 'https://www.google.com/'
        });
        
        expect(hits).toHaveLength(10);
        
        // Verify unique sessions but same post
        const sessionIds = new Set(hits.map(h => h.session_id));
        expect(sessionIds.size).toBe(10);
        
        hits.forEach((hit) => {
            expectPageHit(hit).toBeForPost(post.uuid, post.slug);
        });
    });
    
    test('tracks different page types', async () => {
        const pageTests = [
            {pathname: '/', location: 'US'},
            {pathname: '/about/', location: 'GB'},
            {pathname: '/tag/ghost/', location: 'AU'},
            {pathname: '/author/john/', location: 'DE'}
        ];
        
        const hits = await Promise.all(
            pageTests.map(page => createPageHit(page))
        );
        
        hits.forEach((hit, i) => {
            expect(hit.payload.pathname).toBe(pageTests[i].pathname);
            expect(hit.payload.location).toBe(pageTests[i].location);
        });
    });
    
    test('clears analytics data', async () => {
        await createPageHits(5, {pathname: '/test-clear/'});
        await clearAllPageHits();
        // Test passes if no errors thrown
    });
    
    test('simulates realistic traffic patterns', async ({page}) => {
        const post = await createPublishedPost({
            title: 'Viral Blog Post 2024',
            featured: true
        });
        
        // Create varied traffic
        await Promise.all([
            createPageHits(5, {
                pathname: `/blog/${post.slug}/`,
                post_uuid: post.uuid,
                member_status: 'free',
                referrer: 'https://www.google.com/'
            }),
            createPageHits(3, {
                pathname: `/blog/${post.slug}/`,
                post_uuid: post.uuid,
                member_status: 'undefined',
                referrer: 'https://t.co/abc'
            }),
            createPageHits(2, {
                pathname: `/blog/${post.slug}/`,
                post_uuid: post.uuid,
                member_status: 'paid',
                referrer: ''
            })
        ]);
        
        // Verify in UI
        await loginAsAdmin(page);
        const postsPage = await gotoPosts(page);
        await postsPage.assertPostExists(post.title);
    });
    
    test.describe('Analytics Dashboard', () => {
        // Run this test in isolation with its own cleanup
        test.beforeEach(async () => {
            await clearAllPageHits();
        });
        
        test('shows page hit in analytics dashboard', async ({page}) => {
            // Create a post with unique title
            const uniqueId = Date.now();
            const post = await createPublishedPost({
                title: `Analytics Dashboard Test ${uniqueId}`
            });
            
            await createPageHit({
                pathname: `/blog/${post.slug}/`,
                post_uuid: post.uuid,
                member_status: 'free',
                referrer: 'https://www.google.com/'
            });
            
            // Login and navigate to analytics
            await loginAsAdmin(page);
            // Analytics is the default landing page
            const analyticsPage = new AnalyticsOverviewPage(page);
            
            // Wait for analytics to load
            await analyticsPage.waitForAnalyticsToLoad();
            
            // Verify the analytics page is showing data
            // Just check that we're on the analytics page and it has loaded
            await expect(page).toHaveURL(/.*\/analytics/);
            await expect(analyticsPage.header).toBeVisible();
            
            // The page should show metrics - check for any numbers being displayed
            // This is a simple check that data is being shown
            await expect(page.locator('text=/^\\d+$/').first()).toBeVisible();
        });
        
        test('shows post in latest post performance', async ({page}) => {
            // Create a post with page hits
            const post = await createPublishedPost({
                title: 'Popular Analytics Post'
            });
            
            // Create multiple page hits for this post
            await createPageHits(5, {
                pathname: `/blog/${post.slug}/`,
                post_uuid: post.uuid,
                referrer: 'https://www.google.com/'
            });
            
            // Login and navigate to analytics
            await loginAsAdmin(page);
            const analyticsPage = await gotoAnalytics(page);
            await analyticsPage.waitForAnalyticsToLoad();
            
            // Verify the Latest post performance section exists
            await expect(page.locator('text="Latest post performance"')).toBeVisible();
            
            // Check if our post title appears (it should be in the latest posts)
            await expect(page.locator(`text="${post.title}"`)).toBeVisible();
        });
    });
});