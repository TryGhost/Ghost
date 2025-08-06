import {test, expect} from '../fixtures/playwright';

test.describe('Data Factory Examples', () => {
    test('create post', async ({factories}) => {
        const post = await factories.postFactory.create({
            title: 'Published Post Title',
            published_at: new Date(),
            status: 'published'
        });

        expect(post.title).toBe('Published Post Title');
        expect(post.status).toBe('published');
        expect(post.published_at).toBeDefined();
    });

    test('create post with analytics', async ({factories}) => {
        const post = await factories.postFactory.create({
            title: 'Hello World',
            custom_excerpt: 'This is my first post',
            published_at: new Date(),
            status: 'published',
            uuid: 'post with analytics'
        });

        const hit = await factories.pageHitFactory.create({post_uuid: post.uuid});
        expect(hit.payload.post_uuid).toBe('post with analytics');
    });

    test.skip('multi-session analytics example', async ({factories}) => {
        const post = await factories.postFactory.create({
            title: 'Popular Post',
            custom_excerpt: 'This is my first post',
            featured: true,
            published_at: new Date(),
            status: 'published'
        });

        const session = factories.pageHitFactory.createNewSession();
        await factories.pageHitFactory.createSessionHits(session, 3, {
            post_uuid: post.uuid,
            referrer: 'https://google.com',
            member_status: 'undefined'
        });
    });
});
