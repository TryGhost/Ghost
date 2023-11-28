import {Inject} from '@nestjs/common';
import {Snippet} from './snippet.entity';
import {ISnippetsRepository} from './snippets.repository.interface';
import {Pagination} from '../../common/pagination.type';

type QueryOptions = {
    debug?: boolean;
}

type BookshelfModels = {
    Snippet: {
        findPage: (options: QueryOptions) => Promise<{data: any[], meta: any}>;
    }
};

export class SnippetRepositoryBookshelf implements ISnippetsRepository {
    constructor(
        @Inject('models') private readonly models: BookshelfModels
    ) {}

    async findAll(options: QueryOptions): Promise<{snippets: Snippet[], pagination: Pagination}> {
        const snippetsDBResponse = await this.models.Snippet.findPage(options);

        const snippets = snippetsDBResponse.data
            .map(dbSnippet => Snippet.create({
                id: dbSnippet.get('id'),
                name: dbSnippet.get('name'),
                lexical: dbSnippet.get('lexical'),
                mobiledoc: dbSnippet.get('mobiledoc'),
                createdAt: dbSnippet.get('created_at'),
                updatedAt: dbSnippet.get('updated_at')
            }));

        const pagination = {
            page: snippetsDBResponse.meta.pagination.page,
            limit: snippetsDBResponse.meta.pagination.limit,
            pages: snippetsDBResponse.meta.pagination.pages,
            total: snippetsDBResponse.meta.pagination.total,
            prev: null,
            next: null
        };

        return {
            snippets,
            pagination
        };
    }
}
