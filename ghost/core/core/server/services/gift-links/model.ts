import {z} from 'zod';

export const GiftLinkToken = z.string().brand('GiftLinkToken');
export type GiftLinkToken = z.infer<typeof GiftLinkToken>;

// MySQL returns a Date, SQLite a string/number; normalise to Date on read.
const DbDate = z.codec(z.union([z.date(), z.string(), z.number()]), z.date(), {
    decode: value => new Date(value),
    encode: date => date
});

export const GiftLinkRow = z.object({
    // Unbranded here; the codec brands it into a GiftLinkToken on decode.
    token: z.string(),
    redeemed_count: z.number().int().nonnegative(),
    last_redeemed_at: DbDate.nullable(),
    created_at: DbDate
});

export const GiftLink = z.object({
    token: GiftLinkToken,
    redeemedCount: z.number().int().nonnegative(),
    lastRedeemedAt: z.date().nullable(),
    createdAt: z.date()
});
export type GiftLink = z.infer<typeof GiftLink>;

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

export const GIFT_LINK_COLUMNS = Object.keys(GiftLinkRow.shape);

/** The gift-links aggregate of a post and its live links; distinct from the Bookshelf Post model. */
export interface Post {
    id: string;
    giftLinks: GiftLink[];
}
