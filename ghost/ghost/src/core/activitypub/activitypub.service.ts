import {Inject} from '@nestjs/common';
import {ActorRepository} from './actor.repository';
import {WebFingerService} from './webfinger.service';
import {URI} from './uri.object';
import ObjectID from 'bson-objectid';

export class ActivityPubService {
    constructor(
        private readonly webfinger: WebFingerService,
        @Inject('ActorRepository') private readonly actors: ActorRepository
    ) {}

    async follow(username: string): Promise<void> {
        const json = await this.webfinger.finger(username);
        const actor = await this.actors.getOne(ObjectID.createFromHexString('deadbeefdeadbeefdeadbeef'));

        if (!actor) {
            throw new Error('Could not find default actor');
        }

        const actorToFollow = {
            ...json,
            id: new URI(json.id),
            username
        };

        actor.follow(actorToFollow);

        await this.actors.save(actor);
    }

    async unfollow(username: string): Promise<void> {
        const json = await this.webfinger.finger(username);
        const actor = await this.actors.getOne(ObjectID.createFromHexString('deadbeefdeadbeefdeadbeef'));

        if (!actor) {
            throw new Error('Could not find default actor');
        }

        const actorToUnfollow = {
            id: new URI(json.id),
            username
        };

        actor.unfollow(actorToUnfollow);

        await this.actors.save(actor);
    }
}
