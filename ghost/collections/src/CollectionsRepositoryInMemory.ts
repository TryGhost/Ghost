import {InMemoryRepository} from '@tryghost/in-memory-repository';
import {Collection} from './Collection';

export class CollectionsRepositoryInMemory extends InMemoryRepository<string, Collection> {
    protected toPrimitive(entity: Collection): object {
        return entity.toJSON();
    }
}
