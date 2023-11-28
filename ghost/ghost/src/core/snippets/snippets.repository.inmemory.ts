import ObjectID from 'bson-objectid';
import {Snippet} from './snippet.entity';
import {SnippetsRepository} from './snippets.repository.interface';
import {OrderOf, Page} from '../../common/repository';

export class SnippetsRepositoryInMemory implements SnippetsRepository {
    snippets: Map<string, Snippet>;

    constructor(
    ) {
        this.snippets = new Map();
    }

    async save(entity: Snippet): Promise<void> {
        this.snippets.set(entity.id.toHexString(), entity);
    }
    async getAll(order: OrderOf<[]>[], filter?: string | undefined): Promise<Snippet[]> {
        return [...this.snippets.values()];
    }

    async getSome(page: Page, order: OrderOf<[]>[], filter?: string | undefined): Promise<Snippet[]> {
        return [...this.snippets.values()];
    }

    async getOne(id: ObjectID) {
        return this.snippets.get(id.toHexString()) || null;
    }

    async getCount(filter?: string | undefined): Promise<number> {
        return 0;
    }
}
