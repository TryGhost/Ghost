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

        const actorToFollow = {
            id: new URI(json.id),
            username
        };

        actor.follow(actorToFollow);

        await this.actors.save(actor);
    }
}
