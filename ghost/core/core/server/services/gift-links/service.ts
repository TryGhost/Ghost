import crypto from 'crypto';
import errors from '@tryghost/errors';
import {z} from 'zod';
import type {Knex} from 'knex';
import {GiftLinkRow, GiftLinkToken, giftLinkCodec, type GiftLink, type Post} from './model';
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
        const row = await this.run(queries.liveLinkForToken(token));
        return row ? {id: row.post_id, giftLinks: [z.decode(giftLinkCodec, row)]} : null;
    }

    async issue(postId: string): Promise<Post> {
        const post = await this.requirePost(postId);
        return post.giftLinks.length ? post : this.mint(postId);
    }

    async reissue(postId: string): Promise<Post> {
        const post = await this.requirePost(postId);
        return this.mint(postId, post.giftLinks[0]?.token);
    }

    // Stamp revoked_at on the live links, then drop their associations. The link records stay
    // as history; liveness is the association, so revoked_at only marks deliberate revocation.
    async revokeAll(): Promise<number> {
        const now = new Date();
        let revoked = 0;
        await this.knex.transaction(async (trx) => {
            await trx('gift_links')
                .whereIn('token', trx('post_gift_links').select('gift_link_token'))
                .update({revoked_at: now, updated_at: now});
            revoked = await trx('post_gift_links').del();
        });
        return revoked;
    }

    // Keyed by token, not liveness: a read against a since-reissued token still counts for it.
    async recordRedemption(token: string): Promise<number> {
        const now = new Date();
        return this.knex('gift_links')
            .where({token})
            .update({last_redeemed_at: now, updated_at: now})
            .increment('redeemed_count', 1);
    }

    // Binds an executor-agnostic read statement to this service's connection.
    private run<T>(statement: (knex: Knex) => T): T {
        return statement(this.knex);
    }

    // A missing post is a 404, not a post with no live links: no rows means no post, and the
    // remaining rows carrying a token are the live links.
    private async requirePost(postId: string): Promise<Post> {
        const rows = await this.run(queries.liveLinksForPost(postId));
        if (rows.length === 0) {
            throw new errors.NotFoundError({message: `Post ${postId} does not exist.`});
        }
        const giftLinks = rows
            .filter((row): row is z.input<typeof GiftLinkRow> => row.token !== null)
            .map(row => z.decode(giftLinkCodec, row));
        return {id: postId, giftLinks};
    }

    // Issue and reissue are one upsert: a new store row, with the live association repointed to
    // it. On reissue the replaced link is stamped revoked_at as history. Concurrent issues are
    // last-writer-wins, not an error.
    private async mint(postId: string, replacing?: GiftLinkToken): Promise<Post> {
        const now = new Date();
        const link: GiftLink = {token: generateGiftLinkToken(), redeemedCount: 0, lastRedeemedAt: null, createdAt: now};
        await this.knex.transaction(async (trx) => {
            if (replacing) {
                await trx('gift_links').where({token: replacing}).update({revoked_at: now, updated_at: now});
            }
            await trx('gift_links').insert({...z.encode(giftLinkCodec, link), post_id: postId});
            await trx('post_gift_links')
                .insert({post_id: postId, gift_link_token: link.token, created_at: now})
                .onConflict('post_id')
                .merge({gift_link_token: link.token, updated_at: now});
        });
        return {id: postId, giftLinks: [link]};
    }
}
