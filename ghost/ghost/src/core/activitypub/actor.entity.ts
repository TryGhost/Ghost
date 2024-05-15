import crypto from 'crypto';
import ObjectID from 'bson-objectid';
import {Entity} from '../../common/entity.base';
import {ActivityPub} from './types';
import {Activity} from './activity.entity';
import {Article} from './article.object';
import {ActivityEvent} from './activity.event';
import {HTTPSignature} from './http-signature.service';
import {URI} from './uri.object';

type ActorData = {
    username: string;
    displayName?: string;
    publicKey: string;
    privateKey: string;
    outbox: Activity[];
    inbox: Activity[];
    following: {id: URI, username?: string;}[];
    followers: {id: URI;}[];
};

type CreateActorData = ActorData & {
    id? : ObjectID
};

export class Actor extends Entity<ActorData> {
    get username() {
        return this.attr.username;
    }

    get displayName() {
        if (this.attr.displayName) {
            return this.attr.displayName;
        }
        return this.username;
    }

    get outbox() {
        return this.attr.outbox;
    }

    get following() {
        return this.attr.following;
    }

    get followers() {
        return this.attr.followers;
    }

    get actorId() {
        return new URI(`actor/${this.id.toHexString()}`);
    }

    async sign(request: Request, baseUrl: URL): Promise<Request> {
        const keyId = new URL(this.getJSONLD(baseUrl).publicKey.id);
        const key = crypto.createPrivateKey(this.attr.privateKey);
        return HTTPSignature.sign(request, keyId, key);
    }

    public readonly publicAccount = true;

    async postToInbox(activity: Activity) {
        this.attr.inbox.unshift(activity);
        if (activity.type === 'Follow') {
            if (this.publicAccount) {
                await this.acceptFollow(activity);
                return;
            }
        }
        if (activity.type === 'Accept') {
            // TODO: Check that the Accept is for a real Follow activity
            this.attr.following.push({
                id: activity.actorId,
                username: `@index@${activity.actorId.hostname}`
            });
        }
    }

    async follow(actor: {id: URI, username: string;}) {
        const activity = new Activity({
            activity: new URI(`activity/${(new ObjectID).toHexString()}`),
            type: 'Follow',
            actor: this.actorId,
            object: actor,
            to: actor.id
        });
        this.doActivity(activity);
    }

    async acceptFollow(activity: Activity) {
        if (!activity.activityId) {
            throw new Error('Cannot accept Follow of anonymous activity');
        }
        this.attr.followers.push({id: activity.actorId});
        const accept = new Activity({
            activity: new URI(`activity/${(new ObjectID).toHexString()}`),
            type: 'Accept',
            to: activity.actorId,
            actor: this.actorId,
            object: {id: activity.activityId}
        });
        this.doActivity(accept);
    }

    private doActivity(activity: Activity) {
        this.attr.outbox.push(activity);
        this.activities.push(activity);
        this.addEvent(ActivityEvent.create(activity, this));
    }

    private activities: Activity[] = [];

    static getActivitiesToSave(actor: Actor, fn: (activities: Activity[]) => void) {
        const activities = actor.activities;
        actor.activities = [];
        fn(activities);
    }

    createArticle(article: Article) {
        const activity = new Activity({
            activity: new URI(`activity/${new ObjectID().toHexString()}`),
            to: new URI(`https://www.w3.org/ns/activitystreams#Public`),
            type: 'Create',
            actor: this.actorId,
            object: {id: article.objectId}
        });
        this.doActivity(activity);
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
            name: this.displayName, // Full name
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

    static create(data: Partial<CreateActorData> & {username: string;}) {
        let publicKey = data.publicKey;
        let privateKey = data.privateKey;

        if (!publicKey || !privateKey) {
            const keypair = crypto.generateKeyPairSync('rsa', {
                modulusLength: 512
            });
            publicKey = keypair.publicKey
                .export({type: 'pkcs1', format: 'pem'})
                .toString();
            privateKey = keypair.privateKey
                .export({type: 'pkcs1', format: 'pem'})
                .toString();
        }

        return new Actor({
            id: data.id instanceof ObjectID ? data.id : undefined,
            username: data.username,
            displayName: data.displayName,
            publicKey: publicKey,
            privateKey: privateKey,
            outbox: data.outbox || [],
            inbox: data.inbox || [],
            followers: data.followers || [],
            following: data.following || []
        });
    }
}
