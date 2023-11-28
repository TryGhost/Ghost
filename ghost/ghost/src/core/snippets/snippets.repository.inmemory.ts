import {Pagination} from '../../common/pagination.type';
import {Snippet} from './snippet.entity';
import {SnippetsRepository} from './snippets.repository.interface';

export class SnippetsRepositoryInMemory implements SnippetsRepository {
    snippets: Snippet[];

    constructor(
    ) {
        this.snippets = [];
    }

    async save(entity: Snippet): Promise<void> {
        return;
    }

    async getAll(): Promise<Snippet[]> {
        return this.snippets;
    }

    async getSome(): Promise<Snippet[]> {
        return this.snippets;
    }

    async getOne() {
        return this.snippets[0] || null;
    }

    async getCount(filter?: string | undefined): Promise<number> {
        return 0;
    }
}
