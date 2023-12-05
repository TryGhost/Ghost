import ObjectID from 'bson-objectid';
import {Snippet} from './snippet.entity';
import {SnippetsRepository} from './snippets.repository.interface';
import {OrderOf, Page} from '../../common/repository';
import nql from '@tryghost/nql';

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
        const filterObj = nql(filter);
        return [...this.snippets.values()].filter((value: Snippet) => {
            return filterObj.queryJSON(value);
        });
    }

    async getSome(page: Page, order: OrderOf<[]>[], filter?: string | undefined): Promise<Snippet[]> {
        const all = await this.getAll(order, filter);
        const start = (page.page - 1) * page.count;
        const data = all.slice(start, start + page.count);
        return data;
    }

    async getOne(id: ObjectID) {
        return this.snippets.get(id.toHexString()) || null;
    }

    async getCount(filter?: string | undefined): Promise<number> {
        return (await this.getAll([], filter)).length;
    }
}
