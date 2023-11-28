import {Snippet} from './snippet.entity';
import {Pagination} from '../../common/pagination.type';

export interface ISnippetsRepository {
  findAll(options: {debug?: boolean, filter?: string}): Promise<{snippets: Snippet[], pagination: Pagination}>;
}
