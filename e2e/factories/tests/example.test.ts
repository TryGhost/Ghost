import {test, expect} from '../fixtures/playwright';

test.describe('Data Factory Examples', () => {
    test('create a post - published', async ({factories}) => {
        const post = await factories.postFactory.create({
            title: 'Hello World',
            published_at: new Date(),
            status: 'published'
        });

        expect(post.title).toBe('Hello World');
        expect(post.status).toBe('published');
        expect(post.published_at).toBeDefined();
    });

    test('create post with analytics', async ({factories}) => {
        const post = await factories.postFactory.create({
            title: 'Hello World',
            custom_excerpt: 'This is my first post',
            published_at: new Date(),
            status: 'published'
        });

        const hit = await factories.pageHitFactory.create({
            siteUuid: 'test-uuid',
            post_uuid: post.uuid,
            member_status: 'free',
            pathname: `/posts/${post.slug}`
        });

        expect(hit.payload.post_uuid).toBe(post.uuid);

        /*
        // Generate 100 page views
        const hits = await tinybird.createPageHitsForPost(post.uuid, 100, {
            member_status: 'free',
            pathname: `/posts/${post.slug}`
        });

        expect(hits).toHaveLength(100);
        expect(hits[0].payload.post_uuid).toBe(post.uuid);*/
    });

    test.skip('multi-session analytics example', async ({factories}) => {
        const post = await factories.postFactory.create({
            title: 'Popular Post',
            custom_excerpt: 'This is my first post',
            featured: true,
            published_at: new Date(),
            status: 'published'
        });

        const session1 = factories.pageHitFactory.createNewSession();
        await factories.pageHitFactory.createSessionHits(session1, 3, {
            post_uuid: post.uuid,
            referrer: 'https://google.com',
            member_status: 'undefined'
        });

        /*
        // Session 1: New visitor from Google
        const session1 = tinybird.createNewSession();
        await tinybird.createSessionHits(session1, 3, {
            post_uuid: post.uuid,
            referrer: 'https://google.com',
            member_status: 'undefined'
        });

        // Session 2: Returning paid member
        const session2 = tinybird.createNewSession();
        await tinybird.createSessionHits(session2, 5, {
            post_uuid: post.uuid,
            member_status: 'paid'
        });

        // Session 3: Free member browsing
        const session3 = tinybird.createNewSession();
        await tinybird.createPageHit({
            session_id: session3,
            pathname: '/',
            referrer: 'https://twitter.com'
        });
        await tinybird.createPageHit({
            session_id: session3,
            pathname: `/posts/${post.slug}`,
            post_uuid: post.uuid,
            member_status: 'free'
        });

        // Check page hit stats
        const pageHitStats = tinybird.getStats();
        expect(pageHitStats.sessions).toBe(3);
        expect(pageHitStats.events).toBe(10); // 3 + 5 + 2 */
    });
});
