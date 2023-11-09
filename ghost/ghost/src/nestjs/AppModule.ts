import {Module} from '@nestjs/common';
import {OffersController} from '../http/controllers/OffersController';

@Module({
    controllers: [OffersController],
    providers: []
})
export class AppModule {}
