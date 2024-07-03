import ObjectID from 'bson-objectid';
import {ActivityPub} from './types';
import {Post} from './post.repository';
import {URI} from './uri.object';

type ArticleData = {
    id: ObjectID
    name: string
    content: string
    url: URI
    image: URI | null
    published: Date | null
    attributedTo: {type: string, name: string}[]
    preview: {type: string, content: string}
};

export class Article {
    constructor(private readonly attr: ArticleData) {}

    get objectId() {
        return new URI(`article/${this.attr.id.toHexString()}`);
    }

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
            url: this.attr.url.getValue(url),
            image: this.attr.image?.getValue(url),
            published: this.attr.published?.toISOString(),
            attributedTo: this.attr.attributedTo,
            preview: this.attr.preview
        };
    }

    static fromPost(post: Post) {
        return new Article({
            id: post.id,
            name: post.title,
            content: post.html,
            url: post.url,
            image: post.featuredImage,
            published: post.publishedAt,
            attributedTo: post.authors.map(name => ({
                type: 'Person',
                name
            })),
            preview: {
                type: 'Note',
                content: post.excerpt
            }
        });
    }
}
