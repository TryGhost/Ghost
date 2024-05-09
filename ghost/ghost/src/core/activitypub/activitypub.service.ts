import {Inject} from '@nestjs/common';
import {ActorRepository} from './actor.repository';
import {WebFingerService} from './webfinger.service';
import {URI} from './uri.object';

export class ActivityPubService {
    constructor(
        private readonly webfinger: WebFingerService,
        @Inject('ActorRepository') private readonly actors: ActorRepository
    ) {}

    async follow(username: string): Promise<void> {
        const json = await this.webfinger.finger(username);
        const actor = await this.actors.getOne('index');

        if (!actor) {
            throw new Error('Could not find default actor');
        }

        const actorToFollow = new URI(json.id);

        actor.follow(actorToFollow);

        await this.actors.save(actor);
    }

    async getFollowing(): Promise<string[]> {
        const actor = await this.actors.getOne('index');

        if (!actor) {
            throw new Error('Could not find default actor');
        }

        return actor.following.map(x => x.href);
    }

    async getFollowers(): Promise<string[]> {
        const actor = await this.actors.getOne('index');

        if (!actor) {
            throw new Error('Could not find default actor');
        }

        return actor.followers.map(x => x.href);
    }
}
