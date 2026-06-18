import crypto from 'crypto';
import {z} from 'zod';

/** An opaque, URL-safe, >=128-bit random capability token. Encodes no post id. */
export const GiftLinkToken = z.string().brand('GiftLinkToken');
export type GiftLinkToken = z.infer<typeof GiftLinkToken>;

export function generateGiftLinkToken(): GiftLinkToken {
    return GiftLinkToken.parse(crypto.randomBytes(24).toString('base64url'));
}
