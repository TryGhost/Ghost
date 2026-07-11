import {z} from 'zod';
import errors from '@tryghost/errors';
import type {Knex} from 'knex';
import {GiftLinkRow, giftLinkCodec, giftLinkColumns} from './codec';
import {generateGiftLinkToken, type GiftLink, type Post} from './models';
import {type RecordGiftLinkAction, type RequestContext} from './actions';

// The LEFT JOIN leaves every link column nullable; the explicit generic names a row shape knex
// can't infer from a dynamic column list.
type LiveLinkRow = {[K in keyof z.input<typeof GiftLinkRow>]: z.input<typeof GiftLinkRow>[K] | null};

export class GiftLinksService {
    private knex: Knex;
    private recordAction: RecordGiftLinkAction;

    constructor({knex, recordAction}: {knex: Knex; recordAction: RecordGiftLinkAction}) {
        this.knex = knex;
        this.recordAction = recordAction;
    }

    async getPost(postId: string): Promise<Post> {
        // Anchored on posts: zero rows means the post itself doesn't exist, not merely that it has
        // no live link.
        const rows = await this.knex('posts')
            .where('posts.id', postId)
            .leftJoin('post_gift_links', 'post_gift_links.post_id', 'posts.id')
            .leftJoin('gift_links', 'gift_links.token', 'post_gift_links.gift_link_token')
            .select<LiveLinkRow[]>(giftLinkColumns);

        if (rows.length === 0) {
            throw new errors.NotFoundError({message: `Post ${postId} does not exist.`});
        }

        const giftLinks = rows
            .filter((row): row is z.input<typeof GiftLinkRow> => row.token !== null)
            .map(row => z.decode(giftLinkCodec, row));
        return {id: postId, giftLinks};
    }

    async getPostByToken(token: string): Promise<Post | null> {
        const row = await this.knex('post_gift_links')
            .join('gift_links', 'gift_links.token', 'post_gift_links.gift_link_token')
            .where('gift_links.token', token)
            .first<z.input<typeof GiftLinkRow> & {post_id: string}>(
                [...giftLinkColumns, 'post_gift_links.post_id as post_id']
            );
        return row ? {id: row.post_id, giftLinks: [z.decode(giftLinkCodec, row)]} : null;
    }

    async ensure(context: RequestContext, postId: string): Promise<Post> {
        const post = await this.getPost(postId);
        if (post.giftLinks.length) {
            return post;
        }
        const minted = await this.mint(postId);
        await this.recordAction({context, verb: 'add', subject: postId});
        return minted;
    }

    async create(context: RequestContext, postId: string): Promise<Post> {
        await this.getPost(postId); // asserts the post exists (throws NotFound)
        const minted = await this.mint(postId);
        await this.recordAction({context, verb: 'reset', subject: postId});
        return minted;
    }

    // gift_links rows are kept as history; only the live association is removed.
    async removeAll(context: RequestContext): Promise<number> {
        const removed = await this.knex('post_gift_links').del();
        if (removed > 0) {
            await this.recordAction({context, verb: 'remove', subject: null});
        }
        return removed;
    }

    private async mint(postId: string): Promise<Post> {
        const link: GiftLink = {token: generateGiftLinkToken(), createdAt: new Date()};
        await this.knex.transaction(async (trx) => {
            await this.addToHistory(trx, postId, link);
            await this.setLiveLink(trx, postId, link);
        });
        return {id: postId, giftLinks: [link]};
    }

    private addToHistory(trx: Knex.Transaction, postId: string, link: GiftLink) {
        return trx('gift_links').insert({...z.encode(giftLinkCodec, link), post_id: postId});
    }

    private setLiveLink(trx: Knex.Transaction, postId: string, link: GiftLink) {
        return trx('post_gift_links')
            .insert({post_id: postId, gift_link_token: link.token, created_at: link.createdAt})
            .onConflict('post_id')
            .merge({gift_link_token: link.token, updated_at: link.createdAt});
    }
}
