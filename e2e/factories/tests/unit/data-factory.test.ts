import {test, expect} from '@playwright/test';
import {GhostPlugin, TinybirdPlugin, BasePlugin} from '../../data-management';
import {DataFactory} from '../../data-management/data-factory';

test.describe('DataFactory', () => {
    test('should initialize with default plugins', async () => {
        const factory = new DataFactory();

        expect(factory.ghost).toBeDefined();
        expect(factory.tinybird).toBeDefined();

        await factory.initialize();
        await factory.cleanup();
    });

    test('should accept custom plugin configurations', async () => {
        const factory = new DataFactory({
            plugins: [new GhostPlugin()]
        });

        expect(factory.ghost).toBeDefined();
        expect(() => factory.tinybird).toThrow();

        await factory.initialize();
        await factory.cleanup();
    });

    test('should handle empty plugin array', async () => {
        const factory = new DataFactory({plugins: []});

        expect(() => factory.ghost).toThrow('Ghost plugin not registered');
        expect(() => factory.tinybird).toThrow('Tinybird plugin not registered');

        await factory.initialize();
        await factory.cleanup();
    });

    test('should initialize cross-plugin dependencies', async () => {
        // This test would need a real database with site_uuid
        // For now, we'll test the mechanism exists
        const factory = new DataFactory();
        await factory.initialize();

        // The initialization should have attempted to get site UUID
        // and initialize Tinybird if available
        expect(factory.tinybird).toBeDefined();

        await factory.cleanup();
    });

    test('should register plugins dynamically', async () => {
        const factory = new DataFactory({plugins: []});

        const ghost = new GhostPlugin();
        factory.register(ghost);

        expect(factory.getPlugin('ghost')).toBe(ghost);
        expect(factory.ghost).toBe(ghost);

        await factory.initialize();
        await factory.cleanup();
    });

    test('should handle custom database configuration', async () => {
        // Create a mock database object
        const customDb = {
            select: () => customDb,
            from: () => customDb,
            where: () => customDb,
            first: () => Promise.resolve(null),
            insert: () => customDb,
            update: () => customDb,
            del: () => customDb,
            destroy: () => Promise.resolve()
        } as unknown as ReturnType<typeof import('knex').default>;

        const factory = new DataFactory({
            plugins: [
                new GhostPlugin({database: customDb})
            ]
        });

        await factory.initialize();

        // Should use the custom database
        expect(factory.ghost.getDatabase()).toBe(customDb);

        await factory.cleanup();
    });

    test('should prevent double initialization', async () => {
        const factory = new DataFactory();

        await factory.initialize();

        // Second initialization should work (idempotent)
        await expect(factory.initialize()).resolves.toBeUndefined();

        await factory.cleanup();
    });

    test('should clean up in correct order', async () => {
        const cleanupOrder: string[] = [];

        class TrackedGhostPlugin extends GhostPlugin {
            async destroy() {
                cleanupOrder.push('ghost');
                await super.destroy();
            }
        }

        class TrackedTinybirdPlugin extends TinybirdPlugin {
            async destroy() {
                cleanupOrder.push('tinybird');
                await super.destroy();
            }
        }

        const factory = new DataFactory({
            plugins: [
                new TrackedGhostPlugin(),
                new TrackedTinybirdPlugin()
            ]
        });

        await factory.initialize();
        await factory.cleanup();

        // Should destroy in reverse order of registration
        expect(cleanupOrder).toEqual(['tinybird', 'ghost']);
    });

    test('should handle plugin errors gracefully', async () => {
        class BrokenPlugin extends BasePlugin {
            readonly name = 'broken';

            async setup() {
                throw new Error('Setup failed');
            }

            async destroy() {
                throw new Error('Destroy failed');
            }
        }

        const factory = new DataFactory({
            plugins: [new BrokenPlugin()]
        });

        // Setup error should propagate
        await expect(factory.initialize()).rejects.toThrow('Setup failed');

        // But cleanup should still work
        await expect(factory.cleanup()).rejects.toThrow('Destroy failed');
    });
});

