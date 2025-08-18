import {test, expect} from '@playwright/test';
import knex, {Knex} from 'knex';
import {PostFactory} from '../factories/posts/post-factory';
import {KnexPersistenceAdapter} from '../persistence/adapters/knex';

// Database configuration - uses Ghost's development database
const dbConfig = {
    client: process.env.database__client || 'mysql2',
    connection: {
        host: process.env.database__connection__host || '127.0.0.1',
        user: process.env.database__connection__user || 'root',
        password: process.env.database__connection__password || 'root',
        database: process.env.database__connection__database || 'ghost'
    }
};

test.describe('PostFactory', () => {
    let db: Knex;
    let postFactory: PostFactory;
    let adapter: KnexPersistenceAdapter;

    test.beforeAll(async () => {
        // Initialize database connection
        db = knex(dbConfig);
        
        // Verify connection
        await db.raw('SELECT 1');
        
        // Initialize adapter and factory
        adapter = new KnexPersistenceAdapter(db);
        postFactory = new PostFactory(adapter);
    });

    test.afterAll(async () => {
        if (db) {
            await db.destroy();
        }
    });

    test.afterEach(async () => {
        // Clean up test data
        if (db) {
            await db('posts').where('title', 'like', '%Test%').del();
        }
    });

    test('should build a post in memory without persisting', async () => {
        const post = postFactory.build({
            title: 'Test Post',
            status: 'draft'
        });
        
        expect(post.id).toBeTruthy();
        expect(post.title).toBe('Test Post');
        expect(post.status).toBe('draft');
        expect(post.slug).toBeTruthy();
        expect(post.html).toBeTruthy();
    });

    test('should create and persist a post to the database', async () => {
        const post = await postFactory.create({
            title: 'Test Persisted Post',
            status: 'published'
        });
        
        // Verify the returned post
        expect(post.id).toBeTruthy();
        expect(post.title).toBe('Test Persisted Post');
        expect(post.status).toBe('published');
        expect(post.published_at).toBeTruthy();
        
        // Verify it's in the database
        const found = await adapter.findById<typeof post>('posts', post.id);
        expect(found).toBeTruthy();
        expect(found?.title).toBe('Test Persisted Post');
    });

    test('should generate unique data for each post', async () => {
        const post1 = postFactory.build();
        const post2 = postFactory.build();
        
        expect(post1.id).not.toBe(post2.id);
        expect(post1.slug).not.toBe(post2.slug);
        expect(post1.title).not.toBe(post2.title);
    });

    test('should handle published_at logic correctly', async () => {
        const draftPost = postFactory.build({status: 'draft'});
        const publishedPost = postFactory.build({status: 'published'});
        
        expect(draftPost.published_at).toBeNull();
        expect(publishedPost.published_at).toBeTruthy();
    });
});