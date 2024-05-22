import {Inject} from '@nestjs/common';
import {ActorRepository} from './actor.repository';
import ObjectID from 'bson-objectid';
import {PostRepository} from './post.repository';
import {Article} from './article.object';

export class JSONLDService {
    constructor(
        @Inject('ActorRepository') private repository: ActorRepository,
        @Inject('PostRepository') private postRepository: PostRepository,
        @Inject('ActivityPubBaseURL') private url: URL
    ) {}

    async getActor(id: ObjectID) {
        const actor = await this.repository.getOne(id);
        return actor?.getJSONLD(this.url);
    }

    async getFollowing(owner: ObjectID) {
        const actor = await this.repository.getOne(owner);
        if (!actor) {
            return null;
        }
        return {
            '@context': 'https://www.w3.org/ns/activitystreams',
            id: actor.followingCollectionId.getValue(this.url),
            summary: `Following collection for ${actor.username}`,
            type: 'Collection',
            totalItems: actor.following.length,
            items: actor.following.map(item => ({id: item.id.getValue(this.url), username: item.username}))
        };
    }

    async getFollowers(owner: ObjectID) {
        const actor = await this.repository.getOne(owner);
        if (!actor) {
            return null;
        }
        return {
            '@context': 'https://www.w3.org/ns/activitystreams',
            id: actor.followersCollectionId.getValue(this.url),
            summary: `Followers collection for ${actor.username}`,
            type: 'Collection',
            totalItems: actor.followers.length,
            items: actor.followers.map(item => item.id.getValue(this.url))
        };
    }

    async getInbox(owner: ObjectID) {
        const actor = await this.repository.getOne(owner);
        if (!actor) {
            return null;
        }
        const json = actor.getJSONLD(this.url);
        return {
            '@context': 'https://www.w3.org/ns/activitystreams',
            id: json.inbox,
            summary: `Inbox for ${actor.username}`,
            type: 'OrderedCollection',
            totalItems: actor.inbox.length,
            orderedItems: actor.inbox.map(activity => activity.getJSONLD(this.url))
        };
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

    async getArticle(id: ObjectID) {
        const post = await this.postRepository.getOne(id);
        if (!post) {
            throw new Error('Not found');
        }
        if (post.visibility !== 'public') {
            throw new Error('Cannot view');
        }
        return Article.fromPost(post).getJSONLD(this.url);
    }
}
