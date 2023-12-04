import {InMemoryRepository} from '@tryghost/in-memory-repository';
import {Collection} from './Collection';

export class CollectionsRepositoryInMemory extends InMemoryRepository<string, Collection> {
    protected toPrimitive(entity: Collection): object {
        return entity.toJSON();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createTransaction(cb: (transaction: any) => Promise<any>): Promise<any> {
        return cb(null);
    }

    async getBySlug(slug: string): Promise<Collection | null> {
        return this.store.find(item => item.slug === slug) || null;
    }
}
