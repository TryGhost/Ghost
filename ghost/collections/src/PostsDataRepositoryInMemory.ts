import {InMemoryRepository} from '@tryghost/in-memory-repository';
import {PostDTO} from './PostDTO';

export class PostsDataRepositoryInMemory extends InMemoryRepository<string, PostDTO> {
    constructor() {
        super();
    }

    getBulk(ids: string[]): Promise<PostDTO[]> {
        const postDTOs = this.getAll({
            filter: `id:[${ids.join(',')}]`
        });

        return postDTOs;
    }

    protected toPrimitive(entity: PostDTO): object {
        return {
            ...entity
        };
    }
}
