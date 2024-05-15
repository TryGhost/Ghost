import {Global, Module} from '@nestjs/common';
import {ActorRepositoryInMemory} from '../../db/in-memory/actor.repository.in-memory';
import {ActivityPubController} from '../../http/frontend/controllers/activitypub.controller';
import {WebFingerService} from '../../core/activitypub/webfinger.service';
import {JSONLDService} from '../../core/activitypub/jsonld.service';
import {WebFingerController} from '../../http/frontend/controllers/webfinger.controller';
import {ActivityService} from '../../core/activitypub/activity.service';
import {KnexPostRepository} from '../../db/knex/post.repository.knex';
import {HTTPSignature} from '../../core/activitypub/http-signature.service';
import {InboxService} from '../../core/activitypub/inbox.service';
import {ActivityRepositoryInMemory} from '../../db/in-memory/activity.repository.in-memory';
import {ActivityListener} from '../../listeners/activity.listener';
import {TheWorld} from '../../core/activitypub/tell-the-world.service';
import {ActivityPubService} from '../../core/activitypub/activitypub.service';

@Global()
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
        {
            provide: 'ActivityRepository',
            useClass: ActivityRepositoryInMemory
        },
        WebFingerService,
        JSONLDService,
        HTTPSignature,
        ActivityService,
        InboxService,
        ActivityListener,
        ActivityPubService,
        TheWorld
    ]
})
export class ActivityPubModule {}
