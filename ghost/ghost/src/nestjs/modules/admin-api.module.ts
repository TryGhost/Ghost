import {DynamicModule} from '@nestjs/common';
import {ExampleController} from '../../http/admin/controllers/example.controller';
import {ExampleService} from '../../core/example/example.service';
import {ExampleRepositoryInMemory} from '../../db/in-memory/example.repository.in-memory';

class AdminAPIModuleClass {}

export const AdminAPIModule: DynamicModule = {
    module: AdminAPIModuleClass,
    controllers: [ExampleController],
    exports: [ExampleService],
    providers: [
        ExampleService,
        {
            provide: 'ExampleRepository',
            useClass: ExampleRepositoryInMemory
        }
    ]
};
