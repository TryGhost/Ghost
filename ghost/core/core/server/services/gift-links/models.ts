import crypto from 'crypto';
import {z} from 'zod';

export const GiftLinkToken = z.string().brand('GiftLinkToken');
export type GiftLinkToken = z.infer<typeof GiftLinkToken>;

// 24 random bytes (192 bits of entropy); base64url keeps it URL-safe.
export function generateGiftLinkToken(): GiftLinkToken {
    return GiftLinkToken.parse(crypto.randomBytes(24).toString('base64url'));
}

export const GiftLink = z.object({
    token: GiftLinkToken,
    createdAt: z.date()
});
export type GiftLink = z.infer<typeof GiftLink>;

/** A post and its live gift links — distinct from the Bookshelf Post model. */
export interface Post {
    id: string;
    giftLinks: GiftLink[];
}
