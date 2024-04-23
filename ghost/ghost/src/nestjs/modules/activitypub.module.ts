import {Module} from '@nestjs/common';
import {ActorRepositoryInMemory} from '../../db/in-memory/actor.repository.in-memory';
import {ActivityPubController} from '../../http/frontend/controllers/activitypub.controller';
import {WebFingerService} from '../../core/activitypub/webfinger.service';
import {JSONLDService} from '../../core/activitypub/jsonld.service';
import {WebFingerController} from '../../http/frontend/controllers/webfinger.controller';

@Module({
    controllers: [ActivityPubController, WebFingerController],
    exports: [],
    providers: [
        {
            provide: 'ActorRepository',
            useClass: ActorRepositoryInMemory
        },
        WebFingerService,
        JSONLDService
    ]
})
export class ActivityPubModule {}
