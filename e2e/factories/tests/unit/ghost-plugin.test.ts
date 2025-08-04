import {test, expect} from '../../fixtures/playwright';

test.describe('Ghost Plugin', () => {
    test('should create a draft post by default', async ({ghost}) => {
        const post = await ghost.createPost();

        expect(post.id).toBeTruthy();
        expect(post.uuid).toBeTruthy();
        expect(post.title).toBeTruthy();
        expect(post.slug).toBeTruthy();
        expect(post.status).toBe('draft');
        expect(post.type).toBe('post');
        expect(post.visibility).toBe('public');
        expect(post.published_at).toBeNull();
    });

    test('should create a published post with timestamp', async ({ghost}) => {
        const before = new Date();
        const post = await ghost.createPublishedPost({
            title: 'Published Post'
        });
        const after = new Date();

        expect(post.status).toBe('published');
        expect(post.title).toBe('Published Post');
        expect(post.published_at).toBeTruthy();

        const publishedAt = new Date(post.published_at!);
        expect(publishedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(publishedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    test('should create a scheduled post', async ({ghost}) => {
        const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const post = await ghost.createScheduledPost(futureDate, {
            title: 'Future Post'
        });

        expect(post.status).toBe('scheduled');
        expect(post.published_at).toBeTruthy();
        expect(new Date(post.published_at!).getTime()).toBe(futureDate.getTime());
    });

    test('should generate proper slugs', async ({ghost}) => {
        const testCases = [
            {title: 'Simple Title', expectedSlug: 'simple-title'},
            {title: 'Title With Numbers 123', expectedSlug: 'title-with-numbers-123'},
            {title: 'Special Characters!@#$%', expectedSlug: 'special-characters'},
            {title: '   Spaces   Everywhere   ', expectedSlug: 'spaces-everywhere'}
        ];

        for (const {title, expectedSlug} of testCases) {
            const post = await ghost.createPost({title});
            expect(post.slug).toMatch(new RegExp(`^${expectedSlug}-[0-9a-f]+$`));
        }
    });

    test('should handle custom post properties', async ({ghost}) => {
        const post = await ghost.createPost({
            title: 'Custom Post',
            custom_excerpt: 'This is a custom excerpt',
            featured: true,
            visibility: 'members',
            type: 'page',
            locale: 'es'
        });

        expect(post.custom_excerpt).toBe('This is a custom excerpt');
        expect(post.featured).toBe(true);
        expect(post.visibility).toBe('members');
        expect(post.type).toBe('page');
        expect(post.locale).toBe('es');
    });

    test('should track created posts for cleanup', async ({ghost}) => {
        const initialStats = ghost.getStats();

        await ghost.createPost({title: 'Post 1'});
        await ghost.createPost({title: 'Post 2'});
        await ghost.createPublishedPost({title: 'Post 3'});

        const finalStats = ghost.getStats();
        expect(finalStats.posts).toBe(initialStats.posts + 3);
    });

    test('should provide direct factory access', async ({ghost}) => {
        const post = await ghost.posts.create({
            title: 'Direct Factory Post',
            status: 'published',
            featured: true
        });

        expect(post.title).toBe('Direct Factory Post');
        expect(post.status).toBe('published');
        expect(post.featured).toBe(true);
    });

    test('should generate valid mobiledoc format', async ({ghost}) => {
        const post = await ghost.createPost({
            title: 'Mobiledoc Test'
        });

        expect(post.mobiledoc).toBeTruthy();
        const mobiledoc = JSON.parse(post.mobiledoc);

        expect(mobiledoc.version).toBe('0.3.1');
        expect(mobiledoc.atoms).toEqual([]);
        expect(mobiledoc.cards).toEqual([]);
        expect(mobiledoc.markups).toEqual([]);
        expect(mobiledoc.sections).toHaveLength(1);
        expect(mobiledoc.sections[0][0]).toBe(1); // Section type
        expect(mobiledoc.sections[0][1]).toBe('p'); // Tag name
        expect(mobiledoc.sections[0][2][0][2]).toBe(0); // Markup ref
        expect(typeof mobiledoc.sections[0][2][0][3]).toBe('string'); // Content exists
    });

    test('should handle concurrent post creation', async ({ghost}) => {
        const titles = Array.from({length: 10}, (_, i) => `Concurrent Post ${i}`);

        const posts = await Promise.all(
            titles.map(title => ghost.createPost({title}))
        );

        expect(posts).toHaveLength(10);

        // Check all posts have unique IDs
        const ids = new Set(posts.map(p => p.id));
        expect(ids.size).toBe(10);

        // Check all titles are correct
        posts.forEach((post, i) => {
            expect(post.title).toBe(`Concurrent Post ${i}`);
        });
    });
});
