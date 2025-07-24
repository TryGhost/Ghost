import {test, expect} from '@playwright/test';
import {GhostPlugin} from '../../plugins/ghost/ghost-plugin';
import {PostFactory} from '../../plugins/ghost/posts/post-factory';
import type {PersistenceAdapter} from '../../persistence/types';

// Mock persistence adapter for testing
class MockPersistenceAdapter implements PersistenceAdapter {
    private storage = new Map<string, unknown[]>();
    private lastInserted: unknown = null;
    
    async insert<T>(entityType: string, data: T): Promise<T> {
        if (!this.storage.has(entityType)) {
            this.storage.set(entityType, []);
        }
        this.storage.get(entityType)!.push(data);
        this.lastInserted = data;
        return data;
    }
    
    async update<T>(_entityType: string, _id: string, _data: Partial<T>): Promise<T> {
        void _entityType;
        void _id;
        void _data;
        throw new Error('Not implemented');
    }
    
    async delete(entityType: string, id: string): Promise<void> {
        const entities = this.storage.get(entityType) || [];
        const index = entities.findIndex(e => (e as Record<string, unknown>).id === id);
        if (index >= 0) {
            entities.splice(index, 1);
        }
    }
    
    async deleteMany(entityType: string, ids: string[]): Promise<void> {
        const entities = this.storage.get(entityType) || [];
        this.storage.set(entityType, entities.filter(e => !ids.includes((e as Record<string, unknown>).id as string)));
    }
    
    async findById<T>(entityType: string, id: string): Promise<T | null> {
        const entities = this.storage.get(entityType) || [];
        return entities.find(e => (e as Record<string, unknown>).id === id) as T || null;
    }
    
    async findMany<T>(entityType: string, _query?: Record<string, unknown>): Promise<T[]> {
        void _query;
        return (this.storage.get(entityType) || []) as T[];
    }
    
    getLastInserted() {
        return this.lastInserted;
    }
    
    getAll(entityType: string) {
        return this.storage.get(entityType) || [];
    }
}

test.describe('Persistence Architecture', () => {
    test('factory should work with injected persistence', async () => {
        const mockAdapter = new MockPersistenceAdapter();
        const factory = new PostFactory();
        factory.setPersistence(mockAdapter);
        
        // Build doesn't use persistence
        const built = factory.build({title: 'Built Post'});
        expect(built.title).toBe('Built Post');
        expect(mockAdapter.getLastInserted()).toBeNull();
        
        // Create uses persistence
        const created = await factory.create({title: 'Created Post'});
        expect(created.title).toBe('Created Post');
        expect(mockAdapter.getLastInserted()).toEqual(created);
        
        // Should be tracked for cleanup
        expect(factory.getCreatedEntities()).toHaveLength(1);
    });
    
    test('plugin should configure persistence for all factories', async () => {
        const mockAdapter = new MockPersistenceAdapter();
        const plugin = new GhostPlugin({persistence: mockAdapter});
        
        // Create a post through the plugin
        await plugin.createPublishedPost({title: 'Test Post'});
        
        // Should be in mock storage
        const stored = mockAdapter.getAll('posts');
        expect(stored).toHaveLength(1);
        expect((stored[0] as Record<string, unknown>).title).toBe('Test Post');
        expect((stored[0] as Record<string, unknown>).status).toBe('published');
    });
    
    test('cleanup should use persistence adapter', async () => {
        const mockAdapter = new MockPersistenceAdapter();
        const plugin = new GhostPlugin({persistence: mockAdapter});
        
        // Create multiple posts
        await plugin.createPost({title: 'Post 1'});
        await plugin.createPost({title: 'Post 2'});
        await plugin.createPost({title: 'Post 3'});
        
        // Should have 3 posts
        expect(mockAdapter.getAll('posts')).toHaveLength(3);
        
        // Clean up
        await plugin.destroy();
        
        // Should be empty
        expect(mockAdapter.getAll('posts')).toHaveLength(0);
    });
    
    test('switching persistence adapters', async () => {
        // Start with one adapter
        const adapter1 = new MockPersistenceAdapter();
        const plugin = new GhostPlugin({persistence: adapter1});
        
        await plugin.createPost({title: 'Post in Adapter 1'});
        expect(adapter1.getAll('posts')).toHaveLength(1);
        
        // Switch to another adapter
        const adapter2 = new MockPersistenceAdapter();
        plugin.setPersistenceAdapter(adapter2);
        
        await plugin.createPost({title: 'Post in Adapter 2'});
        
        // First adapter still has its post
        expect(adapter1.getAll('posts')).toHaveLength(1);
        
        // Second adapter has the new post
        expect(adapter2.getAll('posts')).toHaveLength(1);
        expect((adapter2.getAll('posts')[0] as Record<string, unknown>).title).toBe('Post in Adapter 2');
    });
    
    test('factory without persistence should throw', async () => {
        const factory = new PostFactory();
        
        // Build should work
        expect(() => factory.build({title: 'Test'})).not.toThrow();
        
        // Create should throw
        await expect(factory.create({title: 'Test'}))
            .rejects.toThrow('No persistence adapter configured');
    });
});