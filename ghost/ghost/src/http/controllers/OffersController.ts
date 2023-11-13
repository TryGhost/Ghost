import {Controller, Get, Inject} from '@nestjs/common';

@Controller('offers')
export class OffersController {
    constructor(
      @Inject('INJECTION_TOKEN') public readonly value: string
    ) {}

    @Get('')
    getAll() {
        return 'Hello, world!' + this.value;
    }
}
