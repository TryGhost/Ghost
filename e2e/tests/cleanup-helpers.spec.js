const {test, expect} = require('@playwright/test');
const {createGhostDataFactory} = require('../lib/ghost-data-factory');

test.describe('DataFactory Cleanup Helpers', () => {
    let factory;

    test.beforeAll(async () => {
        factory = createGhostDataFactory();
    });

    test.afterAll(async () => {
        await factory.destroy();
    });

    test('should clean up posts with cleanUp helper', async () => {
        // Create some posts
        const posts = [];
        for (let i = 0; i < 3; i++) {
            const post = await factory.createPublishedPost({
                title: `Test Post ${i}`
            });
            posts.push(post);
        }

        // Verify posts exist
        const count = await factory.knex('posts')
            .whereIn('id', posts.map(p => p.id))
            .count('* as count');
        expect(count[0].count).toBe(3);

        // Clean up using helper
        const deleted = await factory.cleanUp('posts', posts);
        expect(deleted).toBe(3);

        // Verify posts are gone
        const afterCount = await factory.knex('posts')
            .whereIn('id', posts.map(p => p.id))
            .count('* as count');
        expect(afterCount[0].count).toBe(0);
    });

    test('should clean up members with cleanUp helper', async () => {
        // Create some members
        const members = [];
        for (let i = 0; i < 3; i++) {
            const member = await factory.createFreeMember({
                email: `cleanup-test-${i}@example.com`
            });
            members.push(member);
        }

        // Verify members exist
        const count = await factory.knex('members')
            .whereIn('id', members.map(m => m.id))
            .count('* as count');
        expect(count[0].count).toBe(3);

        // Clean up using helper
        const deleted = await factory.cleanUp('members', members);
        expect(deleted).toBe(3);

        // Verify members are gone
        const afterCount = await factory.knex('members')
            .whereIn('id', members.map(m => m.id))
            .count('* as count');
        expect(afterCount[0].count).toBe(0);
    });

    test('should handle cleanup with just IDs', async () => {
        // Create a post
        const post = await factory.createPublishedPost({
            title: 'ID Cleanup Test'
        });

        // Clean up using just the ID
        const deleted = await factory.cleanUp('posts', [post.id]);
        expect(deleted).toBe(1);

        // Verify post is gone
        const exists = await factory.knex('posts')
            .where('id', post.id)
            .first();
        expect(exists).toBeUndefined();
    });

    test('should handle empty arrays gracefully', async () => {
        const deleted = await factory.cleanUp('posts', []);
        expect(deleted).toBe(0);
    });

    test('should handle null/undefined gracefully', async () => {
        const deleted1 = await factory.cleanUp('posts', null);
        expect(deleted1).toBe(0);

        const deleted2 = await factory.cleanUp('posts', undefined);
        expect(deleted2).toBe(0);
    });

    test('should clean up posts with dependencies', async () => {
        // Create a post with tags
        const post = await factory.posts()
            .withTitle('Post with Dependencies')
            .withTags(['Test Tag 1', 'Test Tag 2'])
            .asPublished()
            .create();

        // Verify post and tags exist
        const postTags = await factory.knex('posts_tags')
            .where('post_id', post.id)
            .count('* as count');
        expect(postTags[0].count).toBeGreaterThan(0);

        // Clean up
        const deleted = await factory.cleanUp('posts', [post]);
        expect(deleted).toBe(1);

        // Verify dependencies are also cleaned
        const afterPostTags = await factory.knex('posts_tags')
            .where('post_id', post.id)
            .count('* as count');
        expect(afterPostTags[0].count).toBe(0);
    });

    test('should clean up multiple entity types with cleanUpBatch', async () => {
        // Create mixed entities
        const posts = [];
        const members = [];
        
        for (let i = 0; i < 2; i++) {
            posts.push(await factory.createPublishedPost({
                title: `Batch Test Post ${i}`
            }));
            members.push(await factory.createFreeMember({
                email: `batch-test-${i}@example.com`
            }));
        }

        // Clean up batch
        const results = await factory.cleanUpBatch({
            posts: posts,
            members: members
        });

        expect(results.posts).toBe(2);
        expect(results.members).toBe(2);

        // Verify all are gone
        const postCount = await factory.knex('posts')
            .whereIn('id', posts.map(p => p.id))
            .count('* as count');
        expect(postCount[0].count).toBe(0);

        const memberCount = await factory.knex('members')
            .whereIn('id', members.map(m => m.id))
            .count('* as count');
        expect(memberCount[0].count).toBe(0);
    });

    test('should handle mixed ID and object arrays', async () => {
        // Create posts
        const post1 = await factory.createPublishedPost({ title: 'Mixed 1' });
        const post2 = await factory.createPublishedPost({ title: 'Mixed 2' });
        const post3 = await factory.createPublishedPost({ title: 'Mixed 3' });

        // Clean up with mixed array (objects and IDs)
        const deleted = await factory.cleanUp('posts', [
            post1,           // Full object
            post2.id,        // Just ID
            { id: post3.id } // Object with id property
        ]);

        expect(deleted).toBe(3);

        // Verify all are gone
        const count = await factory.knex('posts')
            .whereIn('id', [post1.id, post2.id, post3.id])
            .count('* as count');
        expect(count[0].count).toBe(0);
    });

    test('real-world usage example', async () => {
        // Track created entities
        const createdPosts = [];
        const createdMembers = [];

        // Create test data
        const member = await factory.createPaidMember({
            email: 'real-world@example.com'
        });
        createdMembers.push(member);

        const post = await factory.posts()
            .withTitle('Members Only Content')
            .withVisibility('paid')
            .asPublished()
            .create();
        createdPosts.push(post);

        // Do test assertions here...

        // Clean up - simple one-liner instead of complex queries
        await factory.cleanUp('posts', createdPosts);
        await factory.cleanUp('members', createdMembers);

        // Verify cleanup
        const postExists = await factory.knex('posts').where('id', post.id).first();
        const memberExists = await factory.knex('members').where('id', member.id).first();
        
        expect(postExists).toBeUndefined();
        expect(memberExists).toBeUndefined();
    });
});