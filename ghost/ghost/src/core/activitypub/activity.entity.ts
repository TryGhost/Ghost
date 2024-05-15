import {Entity} from '../../common/entity.base';
import {ActivityPub} from './types';
import {URI} from './uri.object';

type ActivityData = {
    activity: URI | null;
    type: ActivityPub.ActivityType;
    actor: URI;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    object: {id: URI, [x: string]: any};
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

    getObject() {
        return this.attr.object;
    }

    get actorId() {
        return this.attr.actor;
    }

    get objectId() {
        return this.attr.object.id;
    }

    get activityId() {
        return this.attr.activity;
    }

    getJSONLD(url: URL): ActivityPub.Activity {
        return {
            '@context': 'https://www.w3.org/ns/activitystreams',
            id: this.activityId?.getValue(url) || null,
            type: this.attr.type,
            actor: {
                type: 'Person',
                id: this.actorId.getValue(url),
                username: `@index@${this.actorId.hostname}`
            },
            object: this.objectId.getValue(url),
            to: this.attr.to?.getValue(url) || null
        };
    }

    static fromJSONLD(json: object) {
        const parsed = checkKeys(['type', 'actor', 'object'], json);
        if (typeof parsed.type !== 'string' || !['Create', 'Follow', 'Accept'].includes(parsed.type)) {
            throw new Error(`Unknown type ${parsed.type}`);
        }
        return new Activity({
            activity: 'id' in json ? getURI(json.id) : null,
            type: parsed.type as ActivityPub.ActivityType,
            actor: getURI(parsed.actor),
            object: {id: getURI(parsed.object)},
            to: 'to' in json ? getURI(json.to) : null
        });
    }
}
