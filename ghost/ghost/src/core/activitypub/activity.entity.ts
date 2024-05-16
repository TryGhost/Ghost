import {Entity} from '../../common/entity.base';
import {Actor} from './actor.entity';
import {Article} from './article.object';
import {ActivityPub} from './types';
import {URI} from './uri.object';

type ActivityData = {
    activity: URI | null;
    type: ActivityPub.ActivityType;
    actor: {
        id: URI;
        type: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [x: string]: any;
    } | Actor;
    object: {
        id: URI;
        type: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [x: string]: any;
    } | Article;
    to: URI | null;
}

function getURI(input: unknown) {
    if (input instanceof URI) {
        return input;
    }
    if (typeof input === 'string') {
        return new URI(input);
    }
    if (typeof input !== 'object' || input === null) {
        throw new Error(`Could not create URI from ${JSON.stringify(input)}`);
    }
    if ('id' in input && typeof input.id === 'string') {
        return new URI(input.id);
    }
    throw new Error(`Could not create URI from ${JSON.stringify(input)}`);
}

function checkKeys<T extends string>(keys: T[], obj: object): Record<T, unknown> {
    for (const key of keys) {
        if (!(key in obj)) {
            throw new Error(`Missing key ${key}`);
        }
    }
    return obj as Record<T, unknown>;
}

export class Activity extends Entity<ActivityData> {
    get type() {
        return this.attr.type;
    }

    getObject(url: URL) {
        if (this.attr.object instanceof Article) {
            return this.attr.object.getJSONLD(url);
        }
        return this.attr.object;
    }

    getActor(url: URL) {
        if (this.attr.actor instanceof Actor) {
            return this.attr.actor.getJSONLD(url);
        }
        return this.attr.actor;
    }

    get actorId() {
        if (this.attr.actor instanceof Actor) {
            return this.attr.actor.actorId;
        }
        return this.attr.actor.id;
    }

    get objectId() {
        if (this.attr.object instanceof Article) {
            return this.attr.object.objectId;
        }
        return this.attr.object.id;
    }

    get activityId() {
        return this.attr.activity;
    }

    getJSONLD(url: URL): ActivityPub.Activity {
        const object = this.getObject(url);
        const actor = this.getActor(url);
        return {
            '@context': 'https://www.w3.org/ns/activitystreams',
            id: this.activityId?.getValue(url) || null,
            type: this.attr.type,
            actor: {
                ...actor,
                id: this.actorId.getValue(url)
            },
            object: {
                ...object,
                id: this.objectId.getValue(url)
            },
            to: this.attr.to?.getValue(url) || null
        };
    }

    static fromJSONLD(json: object) {
        const parsed = checkKeys(['type', 'actor', 'object'], json);
        if (typeof parsed.type !== 'string' || !['Create', 'Follow', 'Accept'].includes(parsed.type)) {
            throw new Error(`Unknown type ${parsed.type}`);
        }
        return new Activity({
            activity: 'id' in json && typeof json.id === 'string' ? getURI(json.id) : null,
            type: parsed.type as ActivityPub.ActivityType,
            actor: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...(parsed.actor as any),
                id: getURI(parsed.actor)
            },
            object: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...(parsed.object as any),
                id: getURI(parsed.object)
            },
            to: 'to' in json ? getURI(json.to) : null
        });
    }
}
