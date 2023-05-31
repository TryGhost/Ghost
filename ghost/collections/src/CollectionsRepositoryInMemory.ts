import {InMemoryRepository} from '@tryghost/in-memory-repository';
import {Collection} from './Collection';
import {CollectionPost} from './CollectionPost';

export class CollectionsRepositoryInMemory extends InMemoryRepository<string, Collection> {
    collectionsPostsRepository: any;

    constructor(deps: any) {
        super();

        this.collectionsPostsRepository = deps.collectionsPostsRepository;
    }

    async saveCollectionPost(collectionPost: CollectionPost) {
        await this.collectionsPostsRepository.save(collectionPost);
    }

    protected toPrimitive(entity: Collection): object {
        return {
            title: entity.title,
            description: entity.description,
            feature_image: entity.featureImage
        };
    }
}
