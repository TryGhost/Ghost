import {Inject} from '@nestjs/common';
import {Snippet} from './snippet.entity';
import {ISnippetsRepository} from './snippets.repository.interface';

type QueryOptions = {
    debug?: boolean;
}

type BookshelfModels = {
    Snippet: {
        findPage: (options: QueryOptions) => Promise<{data: any[]}>;
    }
};

export class SnippetRepositoryBookshelf implements ISnippetsRepository {
    constructor(
        @Inject('models') private readonly models: BookshelfModels
    ) {}

    async findAll(options: QueryOptions): Promise<Snippet[]> {
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

        return snippets;
    }
}
