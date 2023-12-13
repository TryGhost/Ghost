import {SnippetsController} from '../http/admin/controllers/snippets.controller';
import {SnippetsService} from '../core/snippets/snippets.service';
import {KnexSnippetsRepository} from '../db/knex/snippets.repository';
import {Module} from '@nestjs/common';

@Module({
    controllers: [SnippetsController],
    exports: [SnippetsService, 'SnippetsRepository'],
    providers: [
        {
            provide: 'SnippetsRepository',
            useClass: KnexSnippetsRepository
        },
        SnippetsService
    ]
})
export class AdminAPIModule {}

/*
class AdminAPIModuleClass {}

export const AdminAPIModule: DynamicModule = {
    module: AdminAPIModuleClass,
    controllers: [SnippetsController],
    exports: [SnippetsService, 'SnippetsRepository'],
    providers: [
        {
            provide: 'SnippetsRepository',
            useClass: KnexSnippetsRepository
        },
        SnippetsService
    ]
};

*/
