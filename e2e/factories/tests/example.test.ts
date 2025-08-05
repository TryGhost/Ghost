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
    });

    test('multi-session analytics example', async ({factories}) => {
        const post = await factories.postFactory.create({
            title: 'Popular Post',
            custom_excerpt: 'This is my first post',
            featured: true,
            published_at: new Date(),
            status: 'published'
        });

        // Session 1: New visitor from Google
        const session1 = factories.pageHitFactory.createNewSession();
        await factories.pageHitFactory.createSessionHits(session1, 3, {
            post_uuid: post.uuid,
            referrer: 'https://google.com',
            member_status: 'undefined'
        });
    });
});
