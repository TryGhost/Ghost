import {Inject} from '@nestjs/common';
import {Snippet} from './Snippet';
import {ISnippetsRepository} from './snippets.repository.interface';

type QueryOptions = {
    debug?: boolean;
}

type BookshelfModels = {
    Snippet: {
        findPage: (options: QueryOptions) => Promise<Snippet[]>;
    }
};

export class SnippetRepositoryBookshelf implements ISnippetsRepository {
    constructor(
        @Inject('models') private readonly models: BookshelfModels
    ) {}

    async findAll(options: QueryOptions): Promise<Snippet[]> {
        return this.models.Snippet.findPage(options);
    }
}
