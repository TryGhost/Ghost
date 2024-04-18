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

export class Actor extends Entity<ActorData> {
    get username() {
        return this.attr.username;
    }

    getJSONLD(url: URL): ActivityPub.Actor & ActivityPub.RootObject {
        if (!url.href.endsWith('/')) {
            url.href += '/';
        }
        const id = this.id.toHexString();
        const actor = new URL(`actor/${id}`, url.href);
        const publicKey = new URL(`key/${id}`, url.href);
        const inbox = new URL(`inbox/${id}`, url.href);
        const outbox = new URL(`outbox/${id}`, url.href);

        return {
            '@context': [
                'https://www.w3.org/ns/activitystreams',
                'https://w3id.org/security/v1'
            ],
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
