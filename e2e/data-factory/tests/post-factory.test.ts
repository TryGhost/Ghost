import {test, expect} from '@playwright/test';
import knex, {Knex} from 'knex';
import {KnexPersistenceAdapter, PostFactory} from '../../data-factory';

// Ghost's development database configuration
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
        // Initialize database connection and verify connection
        db = knex(dbConfig);
        await db.raw('SELECT 1');

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

    test('built a post', async () => {
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

    test('built unique posts', async () => {
        const post = postFactory.build();
        const anotherPost = postFactory.build();

        expect(post.id).not.toBe(anotherPost.id);
        expect(post.slug).not.toBe(anotherPost.slug);
        expect(post.title).not.toBe(anotherPost.title);
    });

    test('built draft post with correct published_at', async () => {
        const draftPost = postFactory.build({status: 'draft'});

        expect(draftPost.published_at).toBeNull();
    });

    test('built published post with correct published_at', async () => {
        const publishedPost = postFactory.build({status: 'published'});

        expect(publishedPost.published_at).toBeTruthy();
    });

    test('create a post in database', async () => {
        const post = await postFactory.create({
            title: 'Test Persisted Post',
            status: 'published'
        });

        const postInDb = await adapter.findById<typeof post>('posts', post.id);
        expect(postInDb).toBeTruthy();
        expect(postInDb.id).toBeTruthy();
        expect(postInDb.title).toBe('Test Persisted Post');
        expect(postInDb.status).toBe('published');
        expect(postInDb.published_at).toBeTruthy();
    });
});
