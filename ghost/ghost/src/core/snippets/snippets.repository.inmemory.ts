import {Snippet} from './Snippet';
import {ISnippetsRepository} from './snippets.repository.interface';

export class SnippetsRepositoryInMemory implements ISnippetsRepository {
    snippets: Snippet[];

    constructor(
    ) {
        this.snippets = [];
    }

    async findAll(): Promise<Snippet[]> {
        return this.snippets;
    }
}
