import {InMemoryRepository} from '@tryghost/in-memory-repository';
import {CollectionPost} from '../../src/CollectionPost';

export class PostsRepositoryInMemory extends InMemoryRepository<string, CollectionPost & {deleted: false}> {
    protected toPrimitive(entity: CollectionPost): object {
        return {
            id: entity.id,
            featured: entity.featured,
            published_at: entity.published_at,
            tags: entity.tags.map(tag => tag.slug)
        };
    }

    async getAllIds() {
        const posts = await this.getAll();
        return posts.map(post => post.id);
    }
}
