import {z} from 'zod';

export const GiftLinkToken = z.string().brand('GiftLinkToken');
export type GiftLinkToken = z.infer<typeof GiftLinkToken>;

export const GiftLink = z.object({
    token: GiftLinkToken,
    redeemedCount: z.number().int().nonnegative(),
    lastRedeemedAt: z.date().nullable(),
    createdAt: z.date()
});
export type GiftLink = z.infer<typeof GiftLink>;

/** The gift-links aggregate of a post and its live links; distinct from the Bookshelf Post model. */
export interface Post {
    id: string;
    giftLinks: GiftLink[];
}
