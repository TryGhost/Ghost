import {Controller, Get} from '@nestjs/common';

@Controller('offers')
export class OffersController {
    @Get('')
    getAll() {
        return 'Hello, world!';
    }
}
