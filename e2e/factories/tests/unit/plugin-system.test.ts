import {test, expect} from '@playwright/test';
import {GhostPlugin, BasePlugin} from '../../index';
import {DataFactory} from '../../data-management/data-factory';

// Test plugin for testing the plugin system
class TestPlugin extends BasePlugin {
    readonly name = 'test';
    setupCalled = false;
    destroyCalled = false;

    async setup(): Promise<void> {
        this.setupCalled = true;
    }

    async destroy(): Promise<void> {
        this.destroyCalled = true;
    }
}

test.describe('Plugin System', () => {
    test('should initialize with default plugins', async () => {
        const factory = new DataFactory();
        await factory.initialize();

        expect(factory.ghost).toBeDefined();
        expect(factory.tinybird).toBeDefined();

        await factory.cleanup();
    });

    test('should register custom plugins', async () => {
        const testPlugin = new TestPlugin();
        const factory = new DataFactory({
            plugins: [testPlugin]
        });

        expect(factory.getPlugin('test')).toBe(testPlugin);

        await factory.initialize();
        expect(testPlugin.setupCalled).toBe(true);

        await factory.cleanup();
        expect(testPlugin.destroyCalled).toBe(true);
    });

    test('should throw error for missing plugins', () => {
        const factory = new DataFactory({plugins: []});

        expect(() => factory.ghost).toThrow('Ghost plugin not registered');
        expect(() => factory.tinybird).toThrow('Tinybird plugin not registered');
    });

    test('should handle mixed plugin configurations', async () => {
        const testPlugin = new TestPlugin();
        const factory = new DataFactory({
            plugins: [
                new GhostPlugin(),
                testPlugin
            ]
        });

        await factory.initialize();

        expect(factory.ghost).toBeDefined();
        expect(() => factory.tinybird).toThrow('Tinybird plugin not registered');
        expect(factory.getPlugin('test')).toBe(testPlugin);

        await factory.cleanup();
    });

    test('should prevent double cleanup', async () => {
        const factory = new DataFactory();
        await factory.initialize();

        await factory.cleanup();

        // Second cleanup should not throw
        await expect(factory.cleanup()).resolves.toBeUndefined();
    });

    test('should handle plugin initialization errors gracefully', async () => {
        class ErrorPlugin extends BasePlugin {
            readonly name = 'error';
            async setup(): Promise<void> {
                throw new Error('Setup failed');
            }
            async destroy(): Promise<void> {}
        }

        const factory = new DataFactory({
            plugins: [new ErrorPlugin()]
        });

        await expect(factory.initialize()).rejects.toThrow('Setup failed');
    });

    test('should clean up plugins in reverse order', async () => {
        const order: string[] = [];

        class Plugin1 extends BasePlugin {
            readonly name = 'plugin1';
            async setup(): Promise<void> {}
            async destroy(): Promise<void> {
                order.push('plugin1');
            }
        }

        class Plugin2 extends BasePlugin {
            readonly name = 'plugin2';
            async setup(): Promise<void> {}
            async destroy(): Promise<void> {
                order.push('plugin2');
            }
        }

        const factory = new DataFactory({
            plugins: [new Plugin1(), new Plugin2()]
        });

        await factory.initialize();
        await factory.cleanup();

        expect(order).toEqual(['plugin2', 'plugin1']);
    });
});
