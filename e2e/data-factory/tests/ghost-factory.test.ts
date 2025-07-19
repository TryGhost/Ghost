import {test, expect} from '@playwright/test';
import {GhostFactory} from '../factories/ghost-factory';

// Mock knex interface for testing
interface MockKnex {
    client: string;
    connection: Record<string, unknown>;
    pool: {min: number; max: number};
    destroy(): Promise<void>;
    insert(data: Record<string, unknown>): Promise<void>;
    where(column: string, value: unknown): {
        first(): Promise<Record<string, unknown>>;
        delete(): Promise<number>;
    };
    whereIn(column: string, values: unknown[]): {
        delete(): Promise<number>;
    };
}

// Mock knex for unit testing
const mockKnex: MockKnex = {
    client: 'mysql2',
    connection: {},
    pool: {min: 0, max: 5},
    destroy: async () => {},
    insert: async () => {},
    where: () => ({
        first: async () => ({}),
        delete: async () => 1
    }),
    whereIn: () => ({
        delete: async () => 1
    })
};

// Create a callable mock that returns the knex mock
const mockDb = Object.assign(
    () => mockKnex,
    mockKnex
);

test.describe('Ghost Factory', () => {
    let factory: GhostFactory;
    
    test.beforeEach(() => {
        factory = new GhostFactory(mockDb as unknown as import('knex').Knex);
    });
    
    test.afterEach(async () => {
        await factory.destroy();
    });
    
    test('should have correct name', () => {
        expect(factory.name).toBe('ghost');
    });
    
    test('should setup without error', async () => {
        await expect(factory.setup()).resolves.toBeUndefined();
    });
    
    test('should destroy without error', async () => {
        await expect(factory.destroy()).resolves.toBeUndefined();
    });
    
    test('should create post with default values', async () => {
        const post = await factory.createPost();
        
        // Check required fields
        expect(post.id).toBeTruthy();
        expect(post.uuid).toBeTruthy();
        expect(post.title).toBeTruthy();
        expect(post.slug).toBeTruthy();
        
        // Check default values
        expect(post.status).toBe('draft');
        expect(post.type).toBe('post');
        expect(post.visibility).toBe('public');
        expect(post.featured).toBeDefined();
        expect(post.show_title_and_feature_image).toBe(true);
        expect(post.email_recipient_filter).toBe('none');
        expect(post.created_by).toBe('1');
        expect(post.updated_by).toBe('1');
        
        // Check structure
        expect(post.mobiledoc).toBeTruthy();
        expect(post.html).toBeTruthy();
        expect(post.plaintext).toBeTruthy();
        expect(post.custom_excerpt).toBeTruthy();
        expect(post.created_at).toBeInstanceOf(Date);
        expect(post.updated_at).toBeInstanceOf(Date);
    });
    
    test('should create post with custom values', async () => {
        const customOptions = {
            title: 'Custom Test Post',
            status: 'published' as const,
            featured: true,
            custom_excerpt: 'Custom excerpt',
            visibility: 'members'
        };
        
        const post = await factory.createPost(customOptions);
        
        expect(post.title).toBe(customOptions.title);
        expect(post.status).toBe(customOptions.status);
        expect(post.featured).toBe(customOptions.featured);
        expect(post.custom_excerpt).toBe(customOptions.custom_excerpt);
        expect(post.visibility).toBe(customOptions.visibility);
    });
    
    test('should generate proper slug from title', async () => {
        const post = await factory.createPost({
            title: 'This Is A Test Post With Spaces!'
        });
        
        expect(post.slug).toBe('this-is-a-test-post-with-spaces');
    });
    
    test('should use custom slug when provided', async () => {
        const customSlug = 'my-custom-slug';
        const post = await factory.createPost({
            title: 'Some Title',
            slug: customSlug
        });
        
        expect(post.slug).toBe(customSlug);
    });
    
    test('should handle published posts correctly', async () => {
        const publishedAt = new Date('2025-01-01');
        const post = await factory.createPost({
            status: 'published',
            published_at: publishedAt
        });
        
        expect(post.status).toBe('published');
        expect(post.published_at).toBe(publishedAt);
        expect(post.published_by).toBe('1');
    });
    
    test('should handle draft posts correctly', async () => {
        const post = await factory.createPost({
            status: 'draft'
        });
        
        expect(post.status).toBe('draft');
        expect(post.published_at).toBeNull();
        expect(post.published_by).toBeNull();
    });
    
    test('should handle custom IDs and UUIDs', async () => {
        const customId = 'custom-id-123';
        const customUuid = '12345678-1234-4123-8123-123456789abc';
        
        const post = await factory.createPost({
            id: customId,
            uuid: customUuid
        });
        
        expect(post.id).toBe(customId);
        expect(post.uuid).toBe(customUuid);
    });
    
    test('should handle all post types', async () => {
        const pagePost = await factory.createPost({
            type: 'page'
        });
        
        expect(pagePost.type).toBe('page');
        
        const regularPost = await factory.createPost({
            type: 'post'
        });
        
        expect(regularPost.type).toBe('post');
    });
    
    test('should handle all status types', async () => {
        const statuses = ['draft', 'published', 'scheduled', 'sent'] as const;
        
        for (const status of statuses) {
            const post = await factory.createPost({status});
            expect(post.status).toBe(status);
        }
    });
    
    test('should generate valid mobiledoc', async () => {
        const post = await factory.createPost();
        
        expect(post.mobiledoc).toBeTruthy();
        
        // Parse mobiledoc to ensure it's valid JSON
        const mobiledoc = JSON.parse(post.mobiledoc!);
        expect(mobiledoc.version).toBe('0.3.1');
        expect(mobiledoc.atoms).toEqual([]);
        expect(mobiledoc.cards).toEqual([]);
        expect(mobiledoc.markups).toEqual([]);
        expect(mobiledoc.sections).toBeDefined();
        expect(mobiledoc.ghostVersion).toBe('5.0');
    });
    
    test('should handle custom mobiledoc', async () => {
        const customMobiledoc = JSON.stringify({
            version: '0.3.1',
            atoms: [],
            cards: [],
            markups: [],
            sections: [[1, 'p', [[0, [], 0, 'Custom content']]]],
            ghostVersion: '5.0'
        });
        
        const post = await factory.createPost({
            mobiledoc: customMobiledoc
        });
        
        expect(post.mobiledoc).toBe(customMobiledoc);
    });
});