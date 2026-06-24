import crypto from 'crypto';
import errors from '@tryghost/errors';
import {z} from 'zod';
import type {Knex} from 'knex';
import {GiftLinkToken, type GiftLink, type Post} from './models';
import * as queries from './queries';

export function generateGiftLinkToken(): GiftLinkToken {
    return GiftLinkToken.parse(crypto.randomBytes(24).toString('base64url'));
}

export class GiftLinksService {
    private knex: Knex;

    constructor({knex}: {knex: Knex}) {
        this.knex = knex;
    }

    async getPost(postId: string): Promise<Post> {
        return this.requirePost(postId);
    }

    async getPostByToken(token: string): Promise<Post | null> {
        const row = await queries.liveLinkForToken(token)(this.knex);
        return row ? {id: row.post_id, giftLinks: [z.decode(queries.giftLinkCodec, row)]} : null;
    }

    // True only when `token` is a live gift link bound to `postId`, so a token
    // for one post can never validate against another.
    async isValidTokenForPost(token: string, postId: string): Promise<boolean> {
        return (await this.getPostByToken(token))?.id === postId;
    }

    async ensure(postId: string): Promise<Post> {
        const post = await this.requirePost(postId);
        return post.giftLinks.length ? post : this.mint(postId);
    }

    async create(postId: string): Promise<Post> {
        await this.requirePost(postId);
        return this.mint(postId);
    }

    // Remove every live association; the gift_links rows stay as history.
    async removeAll(): Promise<number> {
        return this.knex('post_gift_links').del();
    }

    // A missing post is a 404, not a post with no live links: no rows means no post, and the
    // remaining rows carrying a token are the live links.
    private async requirePost(postId: string): Promise<Post> {
        const rows = await queries.liveLinksForPost(postId)(this.knex);
        if (rows.length === 0) {
            throw new errors.NotFoundError({message: `Post ${postId} does not exist.`});
        }
        const giftLinks = rows
            .filter((row): row is z.input<typeof queries.GiftLinkRow> => row.token !== null)
            .map(row => z.decode(queries.giftLinkCodec, row));
        return {id: postId, giftLinks};
    }

    // A new store row with the live association repointed to it. The replaced link's row stays as
    // history. Concurrent adds are last-writer-wins, not an error.
    private async mint(postId: string): Promise<Post> {
        const now = new Date();
        const link: GiftLink = {token: generateGiftLinkToken(), createdAt: now};
        await this.knex.transaction(async (trx) => {
            await trx('gift_links').insert({...z.encode(queries.giftLinkCodec, link), post_id: postId});
            await trx('post_gift_links')
                .insert({post_id: postId, gift_link_token: link.token, created_at: now})
                .onConflict('post_id')
                .merge({gift_link_token: link.token, updated_at: now});
        });
        return {id: postId, giftLinks: [link]};
    }
}
