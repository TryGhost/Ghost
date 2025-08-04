import type {Factory} from '../factories/factory';
import type {PersistenceAdapter} from '../persistence/adapter';

/**
 * Base interface for all data factory plugins
 */
export interface DataFactoryPlugin {
    readonly name: string;

    setup(): Promise<void>;
    destroy(): Promise<void>;
}

export abstract class BasePlugin implements DataFactoryPlugin {
    abstract readonly name: string;
    protected persistence?: PersistenceAdapter;
    protected factories = new Map<string, Factory<unknown, unknown>>();

    abstract setup(): Promise<void>;

    setPersistenceAdapter(adapter: PersistenceAdapter): void {
        this.persistence = adapter;

        // Apply to all registered factories
        for (const factory of this.factories.values()) {
            factory.setPersistence(adapter);
        }
    }

    /**
     * Register a factory with the plugin
     */
    protected registerFactory<T extends Factory<unknown, unknown>>(factory: T): T {
        this.factories.set(factory.name, factory);

        // Apply current persistence if available
        if (this.persistence) {
            factory.setPersistence(this.persistence);
        }

        return factory;
    }

    /**
     * Clean up all factories
     */
    async destroy(): Promise<void> {
        await Promise.all(
            Array.from(this.factories.values()).map(factory => factory.cleanup())
        );
    }

    /**
     * Get statistics from all factories
     */
    getStats(): Record<string, number> {
        const stats: Record<string, number> = {};

        for (const [name, factory] of this.factories) {
            stats[name] = factory.getCreatedEntities().length;
        }

        return stats;
    }
}
