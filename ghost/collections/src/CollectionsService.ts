import {Collection} from './Collection';

type CollectionsServiceDeps = {
    repository: any;
};

export class CollectionsService {
    repository: any;

    constructor(deps: CollectionsServiceDeps) {
        this.repository = deps.repository;
    }

    async save(data: any): Promise<Collection> {
        const collection = await this.repository.create(data);
        await this.repository.save(collection);
        return collection;
    }

    async edit(data: any): Promise<Collection | null> {
        const collection = await this.repository.getById(data.id);

        if (!collection) {
            return null;
        }

        Object.assign(collection, data);
        await this.repository.save(collection);

        return collection;
    }

    async getById(id: string): Promise<Collection | null> {
        return await this.repository.getById(id);
    }

    async getAll(options?: any): Promise<{data: Collection[], meta: any}> {
        const collections = await this.repository.getAll(options);

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

    async destroy(id: string): Promise<void> {
        const collection = await this.getById(id);

        if (collection) {
            collection.deleted = true;
            await this.save(collection);
        }
    }
}
