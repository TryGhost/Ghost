import {Controller, Get, Query} from '@nestjs/common';
import {SnippetsService} from '../../core/snippets/snippets.service';
import {BrowseSnippetDTO} from './browse-snippet.dto';

@Controller('snippets')
export class SnippetsController {
    constructor(private readonly catsService: SnippetsService) {}

    @Get('')
    async browse(@Query('formats') formats?: 'mobiledoc' | 'lexical', @Query('filter') filter?: string): Promise<{snippets: BrowseSnippetDTO[], meta: any}> {
        const snippets = await this.catsService.browse({
            filter
        });

        const snippetDTOs = snippets.map(snippet => new BrowseSnippetDTO(snippet, {formats}));

        return {
            snippets: snippetDTOs,
            meta: {
                // @NOTE: proper pagination has to be implemented
                pagination: {
                    page: 1,
                    limit: 15,
                    pages: 1,
                    total: snippets.length,
                    next: null,
                    prev: null
                }
            }
        };
    }
}
