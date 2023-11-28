import {Injectable, Inject} from '@nestjs/common';
import {Snippet} from './snippet.entity';
import {Pagination} from '../../common/pagination.type';
import {ISnippetsRepository} from './snippets.repository.interface';

@Injectable()
export class SnippetsService {
    constructor(
        @Inject('SnippetsRepository') private readonly repository: ISnippetsRepository
    ) {}

    async browse(options: {debug?: boolean, filter?: string}): Promise<{snippets: Snippet[], pagination: Pagination}> {
        return this.repository.findAll(options);
    }
}
