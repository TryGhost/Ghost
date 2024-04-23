import {Actor} from './actor.entity';
import {Article} from './article.object';
import {ActivityPub} from './types';

type ActivityData = {
    type: ActivityPub.ActivityType;
    actor: Actor;
    object: Article
}

export class Activity {
    constructor(private readonly attr: ActivityData) {}

    getJSONLD(url: URL): ActivityPub.Activity {
        const actor = this.attr.actor.getJSONLD(url);
        const object = this.attr.object.getJSONLD(url);

        return {
            '@context': 'https://www.w3.org/ns/activitystreams',
            id: null,
            type: 'Create',
            summary: `${actor.name} created an ${object.type.toLowerCase()}.`,
            actor: actor.id,
            object: object.id
        };
    }
}
