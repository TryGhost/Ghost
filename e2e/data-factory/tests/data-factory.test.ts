import {test, expect} from '@playwright/test';
import knex from 'knex';
import {createPost, clearCreatedPosts} from '../index';

// Helper to get direct DB connection for assertions
async function getDb() {
    return knex({
        client: 'mysql2',
        connection: {
            host: process.env.database__connection__host || 'localhost',
            port: parseInt(process.env.database__connection__port || '3306'),
            user: process.env.database__connection__user || 'root',
            password: process.env.database__connection__password || 'root',
            database: process.env.database__connection__database || 'ghost',
            charset: 'utf8mb4'
        },
        pool: {min: 0, max: 5}
    });
}

test.describe('Data Factory', () => {
    let db: ReturnType<typeof knex>;
    
    test.beforeAll(async () => {
        db = await getDb();
    });
    
    test.afterEach(async () => {
        // Use the built-in cleanup
        await clearCreatedPosts();
    });
    
    test.afterAll(async () => {
        if (db) {
            await db.destroy();
        }
    });
    
    test('should create a post with default values', async () => {
        // Create post with factory
        const post = await createPost();
        
        // Verify post has required fields
        expect(post.id).toBeTruthy();
        expect(post.uuid).toBeTruthy();
        expect(post.title).toBeTruthy();
        expect(post.slug).toBeTruthy();
        expect(post.status).toBe('draft');
        expect(post.type).toBe('post');
        expect(post.visibility).toBe('public');
        
        // Verify post exists in database
        const dbPost = await db('posts').where('id', post.id).first();
        expect(dbPost).toBeTruthy();
        expect(dbPost.title).toBe(post.title);
        expect(dbPost.status).toBe('draft');
    });
    
    test('should create a post with custom values', async () => {
        const customData = {
            title: 'Custom Test Post',
            status: 'published' as const,
            featured: true,
            custom_excerpt: 'This is a custom excerpt',
            visibility: 'members'
        };
        
        // Create post with custom values
        const post = await createPost(customData);
        
        // Verify custom values were applied
        expect(post.title).toBe(customData.title);
        expect(post.status).toBe(customData.status);
        expect(post.featured).toBe(true);
        expect(post.custom_excerpt).toBe(customData.custom_excerpt);
        expect(post.visibility).toBe(customData.visibility);
        
        // Verify in database
        const dbPost = await db('posts').where('id', post.id).first();
        expect(dbPost.title).toBe(customData.title);
        expect(dbPost.status).toBe(customData.status);
        expect(dbPost.featured).toBe(1); // MySQL stores boolean as 1/0
        expect(dbPost.custom_excerpt).toBe(customData.custom_excerpt);
    });
    
    test('should generate proper slug from title', async () => {
        const post = await createPost({
            title: 'This Is A Test Post With Spaces!'
        });
        
        expect(post.slug).toBe('this-is-a-test-post-with-spaces');
    });
    
    test('should create multiple posts concurrently', async () => {
        const posts = await Promise.all([
            createPost({title: 'Post 1'}),
            createPost({title: 'Post 2'}),
            createPost({title: 'Post 3'})
        ]);
        
        // Verify all posts were created
        expect(posts).toHaveLength(3);
        expect(posts[0].title).toBe('Post 1');
        expect(posts[1].title).toBe('Post 2');
        expect(posts[2].title).toBe('Post 3');
        
        // Verify all exist in database
        const dbPosts = await db('posts')
            .whereIn('id', posts.map(p => p.id))
            .select('id', 'title');
        
        expect(dbPosts).toHaveLength(3);
    });
    
    test('should cleanup properly with clearCreatedPosts()', async () => {
        // Create a post
        const post = await createPost({title: 'Cleanup Test'});
        const postId = post.id;
        
        // Verify post exists
        let dbPost = await db('posts').where('id', postId).first();
        expect(dbPost).toBeTruthy();
        expect(dbPost.title).toBe('Cleanup Test');
        
        // Clean up
        await clearCreatedPosts();
        
        // Verify post was deleted
        dbPost = await db('posts').where('id', postId).first();
        expect(dbPost).toBeFalsy();
    });
});