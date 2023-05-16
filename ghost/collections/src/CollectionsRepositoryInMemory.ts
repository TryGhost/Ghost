import {InMemoryRepository} from '@tryghost/in-memory-repository';
import {Collection} from './Collection';

export class CollectionsRepositoryInMemory extends InMemoryRepository<string, Collection> {
    constructor() {
        super();
    }

    protected toPrimitive(entity: Collection): object {
        return {
            title: entity.title,
            description: entity.description,
            feature_image: entity.feature_image
        };
    }
}
