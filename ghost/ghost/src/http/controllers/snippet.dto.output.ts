import {Pagination} from '../../common/pagination.type';
import {Snippet} from '../../core/snippets/snippet.entity';

export class SnippetDTO {
    id: string;
    name: string;
    lexical?: string|null;
    mobiledoc?: string|null;
    created_at: Date;
    updated_at: Date|null;

    constructor(data: Snippet, options: {formats?: 'mobiledoc'|'lexical'}) {
        this.id = data.id.toString();
        this.name = data.name;

        if (options.formats === 'lexical') {
            this.lexical = data.lexical || null;
        } else {
            this.mobiledoc = data.mobiledoc || null;
        }

        this.created_at = data.createdAt;
        this.updated_at = data.updatedAt || null;
    }
}
export class BrowseSnippetsDTO {
    snippets: SnippetDTO[];
    meta: {
        pagination: Pagination
    };

    constructor(snippets: Snippet[], pagination: Pick<Pagination, 'page' | 'limit' | 'pages' | 'total'>, options: {formats?: 'mobiledoc'|'lexical'}) {
        this.snippets = snippets.map(snippet => new SnippetDTO(snippet, options));

        this.meta = {
            pagination: {
                ...pagination,
                prev: pagination.page > 1 ? pagination.page - 1 : null,
                next: pagination.page < pagination.pages ? pagination.page + 1 : null
            }
        };
    }
}
