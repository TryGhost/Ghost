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
