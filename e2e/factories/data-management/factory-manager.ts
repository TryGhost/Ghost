import {PersistenceAdapter} from '../persistence';
import {FactoryList} from './factory-list';

export class FactoryManager {
    public readonly factories: FactoryList;

    constructor(fact: FactoryList) {
        this.factories = fact;
    }

    async setup() {
        const adapters = this.persistenceAdapters;
        await Promise.all(Array.from(adapters).map(adapter => adapter.connect()));

        const setupPromises = this.factoryList
            .filter(factory => typeof factory.setup === 'function')
            .map(factory => factory.setup!());

        await Promise.all(setupPromises);
    }

    async cleanup() {
        const cleanupPromises = this.factoryList.map(factory => factory.cleanup());
        await Promise.all(cleanupPromises);
    }

    async destroy() {
        const adapters = this.persistenceAdapters;
        await Promise.all(Array.from(adapters).map(adapter => adapter.disconnect()));
    }

    getStats(): Record<string, number> {
        const stats: Record<string, number> = {};

        for (const factory of this.factoryList) {
            stats[factory.name] = factory.getCreatedEntities().length;
        }

        return stats;
    }

    private get factoryList() {
        return Object.values(this.factories);
    }

    private get persistenceAdapters(): Set<PersistenceAdapter> {
        const adapters = new Set<PersistenceAdapter>();

        for (const factory of this.factoryList) {
            if ('persistence' in factory) {
                const adapter = (factory as { persistence: PersistenceAdapter }).persistence;
                if (adapter) {
                    adapters.add(adapter);
                }
            }
        }

        return adapters;
    }
}
