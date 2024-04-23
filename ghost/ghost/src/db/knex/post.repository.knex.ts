import {Inject} from '@nestjs/common';
import ObjectID from 'bson-objectid';
import {PostRepository} from '../../core/activitypub/post.repository';

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
        if (!row) {
            return null;
        }
        return {
            id,
            title: row.title,
            html: this.urlUtils.transformReadyToAbsolute(row.html),
            slug: row.slug,
            visibility: row.visibility
        };
    }
};
