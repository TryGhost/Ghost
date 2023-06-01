import {InMemoryRepository} from '@tryghost/in-memory-repository';

type CollectionPost = {
    id: string;
    featured: boolean;
    published_at: Date;
    deleted: boolean;
};

export class PostsRepositoryInMemory extends InMemoryRepository<string, CollectionPost> {
    protected toPrimitive(entity: CollectionPost): object {
        return {
            id: entity.id,
            featured: entity.featured,
            published_at: entity.published_at
        };
    }
}
