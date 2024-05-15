import {Inject} from '@nestjs/common';
import {OnEvent} from '../common/decorators/handle-event.decorator';
import {ActivityEvent} from '../core/activitypub/activity.event';
import {TheWorld} from '../core/activitypub/tell-the-world.service';

export class ActivityListener {
    constructor(
        @Inject(TheWorld) private readonly service: TheWorld
    ) {}

    @OnEvent(ActivityEvent)
    async dispatchActivity(event: ActivityEvent) {
        await this.service.deliverActivity(event.data.activity, event.data.actor);
    }
}
