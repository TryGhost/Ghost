import {DynamicModule} from '@nestjs/common';
import {ExampleController} from '../../http/admin/controllers/example.controller';
import {ExampleService} from '../../core/example/example.service';
import {ExampleRepositoryInMemory} from '../../db/in-memory/example.repository.in-memory';
import {ActorRepositoryInMemory} from '../../db/in-memory/actor.repository.in-memory';
import {ActivityPubController} from '../../http/admin/controllers/activitypub.controller';
import {WebFingerService} from '../../core/activitypub/webfinger.service';
import {JSONLDService} from '../../core/activitypub/jsonld.service';

class AdminAPIModuleClass {}

export const AdminAPIModule: DynamicModule = {
    module: AdminAPIModuleClass,
    controllers: [ExampleController, ActivityPubController],
    exports: [ExampleService, 'WebFingerService'],
    providers: [
        ExampleService,
        {
            provide: 'ExampleRepository',
            useClass: ExampleRepositoryInMemory
        }, {
            provide: 'ActorRepository',
            useClass: ActorRepositoryInMemory
        }, {
            provide: 'WebFingerService',
            useClass: WebFingerService
        },
        JSONLDService
    ]
};
