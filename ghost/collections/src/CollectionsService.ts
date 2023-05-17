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

    async getById(id: string): Promise<Collection | null> {
        return await this.repository.getById(id);
    }

    async getAll(): Promise<Collection[]> {
        return await this.repository.getAll();
    }

    async destroy(id: string): Promise<void> {
        const collection = await this.getById(id);

        if (collection) {
            collection.deleted = true;
            await this.save(collection);
        }
    }
}
