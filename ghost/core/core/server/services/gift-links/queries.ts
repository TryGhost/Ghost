import {z} from 'zod';
import type {Knex} from 'knex';
import {DbGiftLink} from './database';
import {GiftLink} from './models';

// The columns the read path selects and the codec decodes into a GiftLink.
export const GiftLinkRow = DbGiftLink.pick({
    token: true,
    redeemed_count: true,
    last_redeemed_at: true,
    created_at: true
});

// Maps a selected row to/from the domain GiftLink (snake_case to camelCase, token branding).
export const giftLinkCodec = z.codec(GiftLinkRow, GiftLink, {
    decode: row => ({
        token: row.token,
        redeemedCount: row.redeemed_count,
        lastRedeemedAt: row.last_redeemed_at,
        createdAt: row.created_at
    }),
    encode: link => ({
        token: link.token,
        redeemed_count: link.redeemedCount,
        last_redeemed_at: link.lastRedeemedAt,
        created_at: link.createdAt
    })
});

const giftLinkColumns = Object.keys(GiftLinkRow.shape).map(column => `gift_links.${column}`);

// Executor-agnostic statements for the read shapes (joins, filters, columns): each is
// parameterised by domain args and takes the connection at execution, so the service binds
// knex (or a trx). The result generic names the row the codec expects, since knex can't infer
// a dynamic column list.
// Anchored on posts: zero rows means the post does not exist; a single all-null row means the
// post exists with no live link (hence the nullable columns).
type LiveLinkRow = {[K in keyof z.input<typeof GiftLinkRow>]: z.input<typeof GiftLinkRow>[K] | null};

export function liveLinksForPost(postId: string) {
    return (knex: Knex) => knex('posts')
        .where('posts.id', postId)
        .leftJoin('post_gift_links', 'post_gift_links.post_id', 'posts.id')
        .leftJoin('gift_links', 'gift_links.token', 'post_gift_links.gift_link_token')
        .select<LiveLinkRow[]>(giftLinkColumns);
}

export function liveLinkForToken(token: string) {
    return (knex: Knex) => knex('post_gift_links')
        .join('gift_links', 'gift_links.token', 'post_gift_links.gift_link_token')
        .where('gift_links.token', token)
        .first<z.input<typeof GiftLinkRow> & {post_id: string}>([...giftLinkColumns, 'post_gift_links.post_id as post_id']);
}
