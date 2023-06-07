import {Collection} from './Collection';
import {CollectionRepository} from './CollectionRepository';
import tpl from '@tryghost/tpl';
import {MethodNotAllowedError} from '@tryghost/errors';

const messages = {
    cannotDeleteBuiltInCollectionError: {
        message: 'Cannot delete builtin collection',
        context: 'The collection {id} is a builtin collection and cannot be deleted'
    }
};

type CollectionsServiceDeps = {
    collectionsRepository: CollectionRepository;
    postsRepository: PostsRepository;
};

type CollectionPostDTO = {
    id: string;
    sort_order: number;
};

type ManualCollection = {
    title: string;
    type: 'manual';
    slug?: string;
    description?: string;
    feature_image?: string;
    filter?: null;
    deletable?: boolean;
};

type AutomaticCollection = {
    title: string;
    type: 'automatic';
    filter: string;
    slug?: string;
    description?: string;
    feature_image?: string;
    deletable?: boolean;
};

type CollectionInputDTO = ManualCollection | AutomaticCollection;

type CollectionDTO = {
    id: string;
    title: string | null;
    slug: string;
    description: string | null;
    feature_image: string | null;
    type: 'manual' | 'automatic';
    filter: string | null;
    created_at: Date;
    updated_at: Date | null;
    posts: CollectionPostDTO[];
};

type CollectionPostInputDTO = {
    id: string;
    featured: boolean;
    published_at: Date;
};

interface PostsRepository {
    getAll(options: {filter?: string}): Promise<any[]>;
}

export class CollectionsService {
    private collectionsRepository: CollectionRepository;
    private postsRepository: PostsRepository;

    constructor(deps: CollectionsServiceDeps) {
        this.collectionsRepository = deps.collectionsRepository;
        this.postsRepository = deps.postsRepository;
    }

    private toDTO(collection: Collection): CollectionDTO {
        return {
            id: collection.id,
            title: collection.title,
            slug: collection.slug,
            description: collection.description || null,
            feature_image: collection.featureImage || null,
            type: collection.type,
            filter: collection.filter,
            created_at: collection.createdAt,
            updated_at: collection.updatedAt,
            posts: collection.posts.map((postId, index) => ({
                id: postId,
                sort_order: index
            }))
        };
    }

    private fromDTO(data: any): any {
        const mappedDTO: {[index: string]:any} = {
            title: data.title,
            slug: data.slug,
            description: data.description,
            featureImage: data.feature_image,
            filter: data.filter
        };

        // delete out keys that contain undefined values
        for (const key of Object.keys(mappedDTO)) {
            if (mappedDTO[key] === undefined) {
                delete mappedDTO[key];
            }
        }

        return mappedDTO;
    }

    async createCollection(data: CollectionInputDTO): Promise<CollectionDTO> {
        const collection = await Collection.create({
            title: data.title,
            slug: data.slug,
            description: data.description,
            type: data.type,
            filter: data.filter,
            featureImage: data.feature_image,
            deletable: data.deletable
        });

        if (collection.type === 'automatic' && collection.filter) {
            const posts = await this.postsRepository.getAll({
                filter: collection.filter
            });

            for (const post of posts) {
                collection.addPost(post);
            }
        }

        await this.collectionsRepository.save(collection);

        return this.toDTO(collection);
    }

    async addPostToCollection(collectionId: string, post: CollectionPostInputDTO): Promise<CollectionDTO | null> {
        const collection = await this.collectionsRepository.getById(collectionId);

        if (!collection) {
            return null;
        }

        collection.addPost(post);

        this.collectionsRepository.save(collection);

        return this.toDTO(collection);
    }

    private async updateAutomaticCollectionItems(collection: Collection, filter?:string) {
        const collectionFilter = filter || collection.filter;

        if (collectionFilter) {
            const posts = await this.postsRepository.getAll({
                filter: collectionFilter
            });

            collection.removeAllPosts();

            for (const post of posts) {
                collection.addPost(post);
            }
        }
    }

    async updateAutomaticCollections() {
        const collections = await this.collectionsRepository.getAll({
            filter: 'type:automatic'
        });

        for (const collection of collections) {
            await this.updateAutomaticCollectionItems(collection);
            await this.collectionsRepository.save(collection);
        }
    }

    async edit(data: any): Promise<CollectionDTO | null> {
        const collection = await this.collectionsRepository.getById(data.id);

        if (!collection) {
            return null;
        }

        if (collection.type === 'manual' && data.posts) {
            for (const post of data.posts) {
                collection.addPost(post);
            }
        }

        if ((collection.type === 'automatic' || data.type === 'automatic') && data.filter) {
            await this.updateAutomaticCollectionItems(collection, data.filter);
        }

        const collectionData = this.fromDTO(data);

        Object.assign(collection, collectionData);

        await this.collectionsRepository.save(collection);

        return this.toDTO(collection);
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

    async getCollectionsForPost(postId: string): Promise<CollectionDTO[]> {
        const collections = await this.collectionsRepository.getAll({
            filter: `posts:${postId}`
        });

        return collections.map(collection => this.toDTO(collection));
    }

    async destroy(id: string): Promise<Collection | null> {
        const collection = await this.getById(id);

        if (collection) {
            if (collection.deletable === false) {
                throw new MethodNotAllowedError({
                    message: tpl(messages.cannotDeleteBuiltInCollectionError.message),
                    context: tpl(messages.cannotDeleteBuiltInCollectionError.context, {
                        id: collection.id
                    })
                });
            }

            collection.deleted = true;
            await this.collectionsRepository.save(collection);
        }

        return collection;
    }

    async removePostFromCollection(id: string, postId: string): Promise<CollectionDTO | null> {
        const collection = await this.getById(id);

        if (!collection) {
            return null;
        }

        if (collection) {
            collection.removePost(postId);
            await this.collectionsRepository.save(collection);
        }

        return this.toDTO(collection);
    }
}
