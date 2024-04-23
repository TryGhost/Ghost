import ObjectID from 'bson-objectid';
import {ActivityPub} from './types';
import {Post} from './post.repository';

type ArticleData = {
    id: ObjectID
    name: string
    content: string
    url: URL
};

export class Article {
    constructor(private readonly attr: ArticleData) {}

    getJSONLD(url: URL): ActivityPub.Article & ActivityPub.RootObject {
        if (!url.href.endsWith('/')) {
            url.href += '/';
        }

        const id = new URL(`article/${this.attr.id.toHexString()}`, url.href);

        return {
            '@context': 'https://www.w3.org/ns/activitystreams',
            type: 'Article',
            id: id.href,
            name: this.attr.name,
            content: this.attr.content,
            url: this.attr.url.href,
            attributedTo: url.href
        };
    }

    static fromPost(post: Post) {
        return new Article({
            id: post.id,
            name: post.title,
            content: post.html,
            url: new URL(`/posts/${post.slug}`, 'https://example.com')
        });
    }
}
