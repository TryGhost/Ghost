import {Module} from '@nestjs/common';
import {ActorRepositoryInMemory} from '../../db/in-memory/actor.repository.in-memory';
import {ActivityPubController} from '../../http/frontend/controllers/activitypub.controller';
import {WebFingerService} from '../../core/activitypub/webfinger.service';
import {JSONLDService} from '../../core/activitypub/jsonld.service';
import {WebFingerController} from '../../http/frontend/controllers/webfinger.controller';
import {ActivityService} from '../../core/activitypub/activity.service';
import {KnexPostRepository} from '../../db/knex/post.repository.knex';

@Module({
    controllers: [ActivityPubController, WebFingerController],
    exports: [],
    providers: [
        {
            provide: 'ActorRepository',
            useClass: ActorRepositoryInMemory
        },
        {
            provide: 'ActivityService',
            useClass: ActivityService
        },
        {
            provide: 'PostRepository',
            useClass: KnexPostRepository
        },
        WebFingerService,
        JSONLDService
    ]
})
export class ActivityPubModule {}
