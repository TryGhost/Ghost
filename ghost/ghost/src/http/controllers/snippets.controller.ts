import {Controller, Get, Inject, Query} from '@nestjs/common';
import {SnippetsService} from '../../core/snippets/snippets.service';
import {BrowseSnippetDTO} from './browse-snippet.dto';
import {ISettingsCache} from '../../common/settings-cache.interface';

@Controller('snippets')
export class SnippetsController {
    timezone: string;

    constructor(
        private readonly catsService: SnippetsService,
        @Inject('settings') private readonly settings: ISettingsCache
    ) {
        const timezoneValue = this.settings.get('timezone');
        if (timezoneValue === null) {
            throw new Error('Timezone setting is required');
        } else {
            this.timezone = timezoneValue;
        }
    }

    @Get('')
    async browse(@Query('formats') formats?: 'mobiledoc' | 'lexical', @Query('filter') filter?: string): Promise<{snippets: BrowseSnippetDTO[], meta: any}> {
        const snippets = await this.catsService.browse({
            filter
        });

        const snippetDTOs = snippets.map(snippet => new BrowseSnippetDTO(snippet, {timezone: this.timezone, formats}));

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
