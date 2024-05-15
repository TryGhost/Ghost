import {Inject} from '@nestjs/common';
import {Activity} from './activity.entity';
import {ActorRepository} from './actor.repository';
import {ActivityRepository} from './activity.repository';
import ObjectID from 'bson-objectid';

export class InboxService {
    constructor(
        @Inject('ActorRepository') private readonly actors: ActorRepository,
        @Inject('ActivityRepository') private readonly activities: ActivityRepository
    ) {}

    async post(owner: ObjectID, activity: Activity) {
        const actor = await this.actors.getOne(owner);

        if (!actor) {
            throw new Error('Not Found');
        }

        await actor.postToInbox(activity);

        await this.actors.save(actor);
        await this.activities.save(activity);
    }
}
