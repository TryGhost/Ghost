import {Pagination} from '../../common/pagination.type';
import {Snippet} from './snippet.entity';
import {ISnippetsRepository} from './snippets.repository.interface';

export class SnippetsRepositoryInMemory implements ISnippetsRepository {
    snippets: Snippet[];

    constructor(
    ) {
        this.snippets = [];
    }

    async findAll(): Promise<{snippets: Snippet[], pagination: Pagination}> {
        return {
            snippets: this.snippets,
            pagination: {
                page: 1,
                limit: 15,
                pages: 1,
                total: this.snippets.length,
                prev: null,
                next: null
            }
        };
    }
}
