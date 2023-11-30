import {Inject} from '@nestjs/common';
import {Snippet} from './snippet.entity';
import {SnippetsRepository} from './snippets.repository.interface';
import ObjectID from 'bson-objectid';

type QueryOptions = {
    debug?: boolean;
    filter?: string;
}

type BookshelfModels = {
    Snippet: {
        findPage: (options: QueryOptions) => Promise<{data: any[], meta: any}>;
        findOne: (id: string) => Promise<any>;
        findAll: (options: QueryOptions) => Promise<any>;
    }
};

export class SnippetRepositoryBookshelf implements SnippetsRepository {
    constructor(
        @Inject('models') private readonly models: BookshelfModels
    ) {}

    async save(snippet: Snippet) {
        return;
    }

    async getOne(id: ObjectID): Promise<Snippet | null> {
        const dbSnippet = await this.models.Snippet.findOne(id.toString());
        return Snippet.create({
            id: dbSnippet.get('id'),
            name: dbSnippet.get('name'),
            lexical: dbSnippet.get('lexical'),
            mobiledoc: dbSnippet.get('mobiledoc'),
            createdAt: dbSnippet.get('created_at'),
            updatedAt: dbSnippet.get('updated_at')
        });
    }

    async getCount(filter?: string | undefined): Promise<number> {
        // @NOTE: this is an inefficient way to get the count. It's here as a stopgap to get
        //        the moving pieces working. It should be either replaced with more efficient
        //        query or the repository would be substituted with a knex implementation.
        const result = await this.models.Snippet.findPage({
            filter: filter
        });

        return result.meta.pagination.total;
    }

    async getAll(): Promise<Snippet[]> {
        const snippetsDBResponse = await this.models.Snippet.findAll({});

        const snippets = snippetsDBResponse.data
            .map((dbSnippet: any) => Snippet.create({
                id: dbSnippet.get('id'),
                name: dbSnippet.get('name'),
                lexical: dbSnippet.get('lexical'),
                mobiledoc: dbSnippet.get('mobiledoc'),
                createdAt: dbSnippet.get('created_at'),
                updatedAt: dbSnippet.get('updated_at')
            }));

        return snippets;
    }

    async getSome(): Promise<Snippet[]> {
        const snippetsDBResponse = await this.models.Snippet.findPage({});

        const snippets = snippetsDBResponse.data
            .map(dbSnippet => Snippet.create({
                id: dbSnippet.get('id'),
                name: dbSnippet.get('name'),
                lexical: dbSnippet.get('lexical'),
                mobiledoc: dbSnippet.get('mobiledoc'),
                createdAt: dbSnippet.get('created_at'),
                updatedAt: dbSnippet.get('updated_at')
            }));

        return snippets;
    }
}
