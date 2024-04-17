import ObjectID from 'bson-objectid';
import {Entity} from '../../common/entity.base';
import {ActivityPub} from './types';

type ActorData = {
    username: string;
    preferredUsername?: string;
    publicKey: string;
    privateKey: string;
};

type CreateActorData = ActorData & {
    id? : ObjectID
};

function makeUrl(base: URL, props: Map<string, string>): URL {
    const url = new URL(base.href);
    for (const [key, value] of props.entries()) {
        url.searchParams.set(key, value);
    }
    return url;
}

function toMap(obj: Record<string, string>): Map<string, string> {
    return new Map(Object.entries(obj));
}

export class Actor extends Entity<ActorData> {
    get username() {
        return this.attr.username;
    }

    getJSONLD(url: URL): ActivityPub.Actor & ActivityPub.RootObject {
        const actor = makeUrl(url, toMap({
            type: 'actor',
            id: this.id.toHexString()
        }));

        const publicKey = makeUrl(url, toMap({
            type: 'key',
            owner: this.id.toHexString()
        }));

        const inbox = makeUrl(url, toMap({
            type: 'inbox',
            owner: this.id.toHexString()
        }));

        const outbox = makeUrl(url, toMap({
            type: 'outbox',
            owner: this.id.toHexString()
        }));

        return {
            '@context': 'https://www.w3.org/ns/activitystreams',
            type: 'Person',
            id: actor.href,
            inbox: inbox.href,
            outbox: outbox.href,
            username: this.attr.username,
            preferredUsername: this.attr.preferredUsername,
            publicKey: {
                id: publicKey.href,
                owner: actor.href,
                publicKeyPem: this.attr.publicKey
            }
        };
    }

    static create(data: CreateActorData) {
        return new Actor({
            id: data.id instanceof ObjectID ? data.id : undefined,
            username: data.username,
            preferredUsername: data.preferredUsername || data.username,
            publicKey: data.publicKey,
            privateKey: data.privateKey
        });
    }
}
