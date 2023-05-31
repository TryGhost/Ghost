import {InMemoryRepository} from '@tryghost/in-memory-repository';
import {CollectionPost} from './CollectionPost';

export class CollectionsPostsRepositoryInMemory extends InMemoryRepository<string, CollectionPost> {
    constructor() {
        super();
    }

    protected toPrimitive(entity: CollectionPost): object {
        return {
            id: entity.id,
            post_id: entity.postId,
            collection_id: entity.collectionId,
            sort_order: entity.sortOrder
        };
    }
}
