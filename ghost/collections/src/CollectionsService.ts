import {Collection} from './Collection';
import {PostDTO} from './PostDTO';
import {CollectionPost} from './CollectionPost';

type CollectionsServiceDeps = {
    collectionsRepository: any;
    postsRepository: {
        getBulk: any;
    }
};

type CollectionPostDTO = {
    id?: string;
    post_id: string;
    collection_id: string;
    sort_order?: number;
};

export class CollectionsService {
    collectionsRepository: any;
    postsRepository: any;

    constructor(deps: CollectionsServiceDeps) {
        this.collectionsRepository = deps.collectionsRepository;
        this.postsRepository = deps.postsRepository;
    }

    async save(data: any): Promise<Collection> {
        const collection = await Collection.create(data);
        await this.collectionsRepository.save(collection);
        return collection;
    }

    /**
     *
     * @param collection to add tags to
     * @param postIds
     */
    private async addPosts(collection: Collection, postDTOs: PostDTO[]) : Promise<Collection> {
        const postIds = postDTOs.map(post => post.id);
        const posts = await this.postsRepository.getBulk(postIds);

        for (const post of posts) {
            const collectionPost = await CollectionPost.create({
                post_id: post.id,
                collection_id: collection.id
            });

            collection.addPost(collectionPost);
        }

        return collection;
    }

    async addPost(collectionPost: CollectionPostDTO): Promise<any> {
        const collection = await this.collectionsRepository.getById(collectionPost.collection_id);

        if (!collection) {
            return null;
        }

        if (!collection.canAddPost(collectionPost)) {
            return null;
        }

        const collectionPostEntity = await CollectionPost.create(collectionPost);
        collection.addPost(collectionPostEntity);
        const savedPostCollection = await this.collectionsRepository.saveCollectionPost(collectionPostEntity);

        return savedPostCollection;
    }

    async edit(data: any): Promise<Collection | null> {
        const collection = await this.collectionsRepository.getById(data.id);

        if (!collection) {
            return null;
        }

        if (data.posts) {
            await this.addPosts(collection, data.posts);
        }

        Object.assign(collection, data);
        await this.collectionsRepository.save(collection);

        return collection;
    }

    async getById(id: string): Promise<Collection | null> {
        return await this.collectionsRepository.getById(id);
    }

    async getAll(options?: any): Promise<{data: Collection[], meta: any}> {
        const collections = await this.collectionsRepository.getAll(options);

        return {
            data: collections,
            meta: {
                pagination: {
                    page: 1,
                    pages: 1,
                    limit: collections.length,
                    total: collections.length,
                    prev: null,
                    next: null
                }
            }
        };
    }

    async destroy(id: string): Promise<Collection | null> {
        const collection = await this.getById(id);

        if (collection) {
            collection.deleted = true;
            await this.save(collection);
        }

        return collection;
    }
}
