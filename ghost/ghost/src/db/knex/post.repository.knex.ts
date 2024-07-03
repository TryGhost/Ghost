import {Inject} from '@nestjs/common';
import ObjectID from 'bson-objectid';
import {PostRepository} from '../../core/activitypub/post.repository';
import {URI} from '../../core/activitypub/uri.object';
import htmlToPlaintext from '@tryghost/html-to-plaintext';

type UrlUtils = {
    transformReadyToAbsolute(html: string): string
}

export class KnexPostRepository implements PostRepository {
    constructor(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        @Inject('knex') private readonly knex: any,
        @Inject('UrlUtils') private readonly urlUtils: UrlUtils
    ) {}
    async getOne(identifier: ObjectID) {
        return this.getOneById(identifier);
    }

    async getOneById(id: ObjectID) {
        const row = await this.knex('posts').where('id', id.toHexString()).first();
        const authorRows = await this.knex('users')
            .leftJoin('posts_authors', 'users.id', 'posts_authors.author_id')
            .where('posts_authors.post_id', id.toHexString())
            .select('users.name');

        if (!row) {
            return null;
        }

        let excerpt = row.custom_excerpt;

        if (!excerpt) {
            const metaRow = await this.knex('posts_meta').where('post_id', id.toHexString()).select('meta_description').first();
            if (metaRow?.meta_description) {
                excerpt = metaRow.meta_description;
            }
        }

        if (!excerpt) {
            excerpt = htmlToPlaintext.excerpt(row.html);
        }

        return {
            id,
            title: row.title,
            html: this.urlUtils.transformReadyToAbsolute(row.html),
            slug: row.slug,
            visibility: row.visibility,
            featuredImage: row.feature_image ? new URI(row.feature_image) : null,
            publishedAt: row.published_at ? new Date(row.published_at) : null,
            authors: authorRows.map((authorRow: {name: string}) => authorRow.name),
            excerpt,
            url: new URI('') // TODO: Get URL for Post
        };
    }
};
