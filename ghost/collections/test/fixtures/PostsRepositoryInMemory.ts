import {InMemoryRepository} from '@tryghost/in-memory-repository';

type CollectionPost = {
    id: string;
    slug: string;
    featured: boolean;
    published_at: Date;
    deleted: boolean;
};

export class PostsRepositoryInMemory extends InMemoryRepository<string, CollectionPost> {
    protected toPrimitive(entity: CollectionPost): object {
        return {
            id: entity.id,
            slug: entity.slug,
            featured: entity.featured,
            published_at: entity.published_at
        };
    }

    getBulk(ids: string[]): Promise<CollectionPost[]> {
        return this.getAll({
            filter: `id:[${ids.join(',')}]`
        });
    }
}
