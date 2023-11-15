import {Controller, Get} from '@nestjs/common';
import {SnippetsService} from './snippets.service';

@Controller('snippets')
export class SnippetsController {
    constructor(private readonly catsService: SnippetsService) {}

    @Get('')
    async browse() {
        return this.catsService.browse();
    }
}
