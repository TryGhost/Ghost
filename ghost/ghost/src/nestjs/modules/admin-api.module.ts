import {Module} from '@nestjs/common';
import {ExampleController} from '../../http/admin/controllers/example.controller';
import {ExampleService} from '../../core/example/example.service';
import {ExampleRepositoryInMemory} from '../../db/in-memory/example.repository.in-memory';
import {IntegrationService} from '../../core/integrations/integration.service';
import {IntegrationController} from '../../http/admin/controllers/integration/integration.controller';
import {IntegrationRepositoryInMemory} from '../../db/in-memory/integration.repository.in-memory';
import {IntegrationRepositoryKnex} from '../../db/sql/integration.repository.knex';

@Module({
    controllers: [ExampleController, IntegrationController],
    exports: [ExampleService, IntegrationService],
    providers: [
        ExampleService,
        {
            provide: 'ExampleRepository',
            useClass: ExampleRepositoryInMemory
        },
        IntegrationService,
        {
            provide: 'IntegrationRepository',
            useClass: IntegrationRepositoryKnex // This is a stub
        }
    ]
})
export class AdminAPIModule {}
