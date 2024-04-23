import {Inject} from '@nestjs/common';
import {ActorRepository} from './actor.repository';
import ObjectID from 'bson-objectid';

export class JSONLDService {
    constructor(
        @Inject('ActorRepository') private repository: ActorRepository,
        @Inject('ActivityPubBaseURL') private url: URL
    ) {}

    async getActor(id: ObjectID) {
        const actor = await this.repository.getOne(id);
        return actor?.getJSONLD(this.url);
    }

    async getOutbox(owner: ObjectID) {
        const actor = await this.repository.getOne(owner);
        if (!actor) {
            return null;
        }
        const json = actor.getJSONLD(this.url);
        return {
            '@context': 'https://www.w3.org/ns/activitystreams',
            id: json.outbox,
            summary: `Outbox for ${actor.username}`,
            type: 'OrderedCollection',
            totalItems: actor.outbox.length,
            orderedItems: actor.outbox.map(activity => activity.getJSONLD(this.url))
        };
    }
}
