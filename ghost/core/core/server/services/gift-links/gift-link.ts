import {z} from 'zod';
import {GiftLinkToken} from './gift-link-token';

/**
 * A tokenised capability to read a post anonymously, identified by its token. There is
 * intentionally no `status` — liveness lives on the {@link Post} aggregate, not the link.
 */
export const GiftLink = z.object({
    token: GiftLinkToken,
    redeemedCount: z.number().int().nonnegative(),
    lastRedeemedAt: z.date().nullable(),
    createdAt: z.date()
});

export type GiftLink = z.infer<typeof GiftLink>;
