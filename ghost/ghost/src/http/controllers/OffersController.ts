import {Controller, Get, Inject} from '@nestjs/common';

@Controller('offers')
export class OffersController {
    constructor(
    ) {}

    @Get('')
    getAll() {
        return 'Hello, world!';
    }
}
