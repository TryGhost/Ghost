import {Controller, Get} from '@nestjs/common';
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
    async browse() {
        return this.catsService.browse();
    }
}
