import {z} from 'zod';
import type {Knex} from 'knex';
import {GIFT_LINK_COLUMNS, GiftLinkRow} from './model';

interface GiftLinkTableRow {
    token: string;
    post_id: string;
    redeemed_count: number;
    last_redeemed_at: Date | null;
    revoked_at: Date | null;
    created_at: Date;
    updated_at: Date | null;
}
interface PostGiftLinkTableRow {
    post_id: string;
    gift_link_token: string;
    created_at: Date;
    updated_at: Date | null;
}
declare module 'knex/types/tables' {
    interface Tables {
        gift_links: Knex.CompositeTableType<
            GiftLinkTableRow,
            z.input<typeof GiftLinkRow> & {post_id: string},
            Partial<GiftLinkTableRow>
        >;
        post_gift_links: Knex.CompositeTableType<
            PostGiftLinkTableRow,
            Pick<PostGiftLinkTableRow, 'post_id' | 'gift_link_token' | 'created_at'>,
            Partial<PostGiftLinkTableRow>
        >;
    }
}

const giftLinkColumns = GIFT_LINK_COLUMNS.map(column => `gift_links.${column}`);

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
