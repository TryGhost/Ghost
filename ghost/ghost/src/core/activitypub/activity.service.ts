import ObjectID from 'bson-objectid';
import {ActorRepository} from './actor.repository';
import {Article} from './article.object';
import {PostRepository} from './post.repository';
import {Inject} from '@nestjs/common';

export class ActivityService {
    constructor(
        @Inject('ActorRepository') private readonly actorRepository: ActorRepository,
        @Inject('PostRepository') private readonly postRepository: PostRepository
    ) {}

    async createArticleForPost(postId: ObjectID) {
        const actor = await this.actorRepository.getOne('index');

        if (!actor) {
            throw new Error('Actor not found');
        }

        const post = await this.postRepository.getOne(postId);

        if (!post) {
            throw new Error('Post not found');
        }

        if (post.visibility !== 'public') {
            return;
        }

        const article = Article.fromPost(post);

        actor.createArticle(article);

        await this.actorRepository.save(actor);
    }
}
