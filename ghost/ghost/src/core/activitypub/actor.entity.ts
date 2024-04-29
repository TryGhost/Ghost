import ObjectID from 'bson-objectid';
import {Entity} from '../../common/entity.base';
import {ActivityPub} from './types';
import {Activity} from './activity.object';
import {Article} from './article.object';
import {ActivityEvent} from './activity.event';

type ActorData = {
    username: string;
    publicKey: string;
    privateKey: string;
    outbox: Activity[];
};

type CreateActorData = ActorData & {
    id? : ObjectID
};

export class Actor extends Entity<ActorData> {
    get username() {
        return this.attr.username;
    }

    get outbox() {
        return this.attr.outbox;
    }

    private activities: Activity[] = [];

    static getActivitiesToSave(actor: Actor, fn: (activities: Activity[]) => void) {
        const activities = actor.activities;
        actor.activities = [];
        fn(activities);
    }

    createArticle(article: Article) {
        const activity = new Activity({
            type: 'Create',
            actor: this,
            object: article
        });
        this.attr.outbox.push(activity);
        this.activities.push(activity);
        this.addEvent(ActivityEvent.create(activity));
    }

    getJSONLD(url: URL): ActivityPub.Actor & ActivityPub.RootObject {
        if (!url.href.endsWith('/')) {
            url.href += '/';
        }
        const id = this.id.toHexString();
        const actor = new URL(`actor/${id}`, url.href);
        const publicKey = new URL(`actor/${id}#main-key`, url.href);
        const inbox = new URL(`inbox/${id}`, url.href);
        const outbox = new URL(`outbox/${id}`, url.href);
        const following = new URL(`following/${id}`, url.href);
        const followers = new URL(`followers/${id}`, url.href);
        const featured = new URL(`featured/${id}`, url.href);

        return {
            '@context': [
                'https://www.w3.org/ns/activitystreams',
                'https://w3id.org/security/v1',
                {
                    featured: {
                        '@id': 'http://joinmastodon.org/ns#featured',
                        '@type': '@id'
                    }
                },
                {
                    discoverable: {
                        '@id': 'http://joinmastodon.org/ns#discoverable',
                        '@type': '@id'
                    }
                },
                {
                    manuallyApprovesFollowers: {
                        '@id': 'http://joinmastodon.org/ns#manuallyApprovesFollowers',
                        '@type': '@id'
                    }
                },
                {
                    schema: 'http://schema.org#',
                    PropertyValue: 'schema:PropertyValue',
                    value: 'schema:value'
                }
            ],
            type: 'Person',
            id: actor.href,
            name: 'Display Name', // Full name
            preferredUsername: this.username, // Username
            summary: 'The bio for the actor', // Bio
            url: actor.href, // Profile URL
            icon: '', // Avatar
            image: '', // Header image
            published: '1970-01-01T00:00:00Z', // When profile was created
            manuallyApprovesFollowers: false, // Locked account
            discoverable: true, // Shown in the profile directory
            attachment: [{
                type: 'PropertyValue',
                name: 'Website',
                value: `<a href='${url.href}'>${url.hostname}</a>`
            }],

            // Collections
            following: following.href,
            followers: followers.href,
            inbox: inbox.href,
            outbox: outbox.href,
            featured: featured.href,

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
            publicKey: data.publicKey,
            privateKey: data.privateKey,
            outbox: data.outbox
        });
    }
}
