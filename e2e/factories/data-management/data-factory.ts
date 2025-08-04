import type {DataFactoryPlugin} from '../plugins/base-plugin';
import {GhostPlugin} from '../plugins/ghost-plugin';
import {TinybirdPlugin} from '../plugins/tinybird-plugin';
import {getSiteUuid} from '../utils/database';

export interface DataFactoryOptions {
    plugins?: DataFactoryPlugin[];
}

/**
 * Data factory that coordinates plugins for creating test data.
 * Each test gets its own instance for proper isolation.
 */
export class DataFactory {
    private plugins = new Map<string, DataFactoryPlugin>();
    private isDestroyed = false;

    constructor(options: DataFactoryOptions = {}) {
        const plugins = options.plugins ?? [
            new GhostPlugin(),
            new TinybirdPlugin()
        ];

        // Register all plugins
        plugins.forEach(plugin => this.register(plugin));
    }

    register<T extends DataFactoryPlugin>(plugin: T): T {
        this.plugins.set(plugin.name, plugin);
        return plugin;
    }

    getPlugin<T extends DataFactoryPlugin>(name: string): T | undefined {
        return this.plugins.get(name) as T;
    }

    async initialize(): Promise<void> {
        // Setup all plugins
        for (const plugin of this.plugins.values()) {
            await plugin.setup();
        }

        // Handle cross-plugin initialization
        await this.initializeCrossPluginDependencies();
    }

    /**
     * Initialize Tinybird with Ghost's site UUID if both plugins are present
     */
    private async initializeCrossPluginDependencies(): Promise<void> {
        const ghost = this.getPlugin<GhostPlugin>('ghost');
        const tinybird = this.getPlugin<TinybirdPlugin>('tinybird');

        // Initialize Tinybird with Ghost's site UUID if both plugins are present
        if (ghost && tinybird && !tinybird.isInitialized()) {
            const siteUuid = await getSiteUuid(ghost.getDatabase());
            if (siteUuid) {
                await tinybird.initializeWithSiteUuid(siteUuid);
            }
        }
    }

    // *
    // Convenience getters for tests, allow for direct access to plugins
    //  e.g. test({ghost}) => ghost.createPost()
    //   vs. test({factory}) => factory.ghost.createPost()
    // *
    get ghost(): GhostPlugin {
        const plugin = this.getPlugin<GhostPlugin>('ghost');
        if (!plugin) {
            throw new Error('Ghost plugin not registered');
        }
        return plugin;
    }

    get tinybird(): TinybirdPlugin {
        const plugin = this.getPlugin<TinybirdPlugin>('tinybird');
        if (!plugin) {
            throw new Error('Tinybird plugin not registered');
        }
        return plugin;
    }

    async cleanup(): Promise<void> {
        if (this.isDestroyed) {
            return;
        }

        // Destroy all plugins in reverse order
        const plugins = Array.from(this.plugins.values()).reverse();
        for (const plugin of plugins) {
            await plugin.destroy();
        }

        this.plugins.clear();
        this.isDestroyed = true;
    }
}
