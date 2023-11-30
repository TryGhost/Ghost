import {Injectable, Inject} from '@nestjs/common';
import {Snippet} from './snippet.entity';
import ObjectID from 'bson-objectid';
import {SnippetsRepository} from './snippets.repository.interface';

@Injectable()
export class SnippetsService {
    constructor(
        @Inject('SnippetsRepository') private readonly repository: SnippetsRepository
    ) {}

    async create(data: {name: string, lexical: string, mobiledoc: string}): Promise<Snippet> {
        const snippet = Snippet.create(data);

        await this.repository.save(snippet);

        return snippet;
    }

    async delete(id: ObjectID) {
        const snippet = await this.repository.getOne(id);

        if (!snippet) {
            return null;
        }

        snippet.delete();

        await this.repository.save(snippet);

        return snippet;
    }

    async update(id: ObjectID, data: {name?: string, lexical?: string, mobiledoc?: string}) {
        const snippet = await this.repository.getOne(id);

        if (!snippet) {
            return null;
        }

        if (data.name) {
            snippet.name = data.name;
        }

        if (data.lexical) {
            snippet.lexical = data.lexical;
        }

        if (data.mobiledoc) {
            snippet.mobiledoc = data.mobiledoc;
        }

        await this.repository.save(snippet);

        return snippet;
    }

    async getOne(id: ObjectID) {
        return this.repository.getOne(id);
    }

    async getAll(options: {filter?: string}): Promise<Snippet[]> {
        const filter = options.filter;
        return this.repository.getAll([], filter);
    }

    async getPage(options: {filter?: string, page: number, limit: number}) {
        const filter = options.filter;
        const page = options.page || 1;
        const limit = options.limit || 15;

        const data = await this.repository.getSome({
            count: limit,
            page
        }, [], filter);
        const count = await this.repository.getCount(filter);

        return {data, count};
    }
}
