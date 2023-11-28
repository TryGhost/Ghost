import {Controller, Get, Query} from '@nestjs/common';
import {SnippetsService} from '../../core/snippets/snippets.service';
import {BrowseSnippetDTO} from './browse-snippet.dto';
import {Pagination} from '../../common/pagination.type';

@Controller('snippets')
export class SnippetsController {
    constructor(private readonly catsService: SnippetsService) {}

    @Get('')
    async browse(@Query('formats') formats?: 'mobiledoc' | 'lexical', @Query('filter') filter?: string): Promise<{snippets: BrowseSnippetDTO[], meta: {pagination: Pagination}}> {
        const {snippets, pagination} = await this.catsService.browse({
            filter
        });

        const snippetDTOs = snippets.map(snippet => new BrowseSnippetDTO(snippet, {formats}));

        return {
            snippets: snippetDTOs,
            meta: {
                pagination
            }
        };
    }
}
