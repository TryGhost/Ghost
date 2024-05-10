import {Module} from '@nestjs/common';
import {ExampleController} from '../../http/admin/controllers/example.controller';
import {ExampleService} from '../../core/example/example.service';
import {ExampleRepositoryInMemory} from '../../db/in-memory/example.repository.in-memory';
import {ActivityPubController} from '../../http/admin/controllers/activitypub.controller';
import {ActivityPubService} from '../../core/activitypub/activitypub.service';
import {WebFingerService} from '../../core/activitypub/webfinger.service';
import {ActorRepositoryInMemory} from '../../db/in-memory/actor.repository.in-memory';

@Module({
    controllers: [ExampleController, ActivityPubController],
    exports: [ExampleService],
    providers: [
        ExampleService,
        ActivityPubService,
        WebFingerService,
        {
            provide: 'ExampleRepository',
            useClass: ExampleRepositoryInMemory
        },
        {
            provide: 'ActorRepository',
            useClass: ActorRepositoryInMemory
        }
    ]
})
export class AdminAPIModule {}
