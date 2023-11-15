import {Controller, Get} from '@nestjs/common';
import {SnippetsService} from '../../core/snippets/snippets.service';

@Controller('snippets')
export class SnippetsController {
    constructor(private readonly catsService: SnippetsService) {}

    @Get('')
    async browse() {
        return this.catsService.browse();
    }
}
