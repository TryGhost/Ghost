import {z} from 'zod';
import {snakeKeys} from './case-keys';
import {GiftLink} from './models';

// Response schemas — the shapes the admin endpoints emit.
const GiftLinkResource = z.object({
    token: z.string(),
    created_at: z.date()
});
const GiftLinksResponse = z.object({gift_links: z.array(GiftLinkResource)});
const GiftLinkPostResponse = z.object({gift_links: z.array(z.object({post_id: z.string()}))});
const RevokeAllResponse = z.object({meta: z.object({count: z.number()})});

export const toGiftLinksResponse = z.array(GiftLink)
    .transform((links): z.input<typeof GiftLinksResponse> => ({
        gift_links: links.map(link => snakeKeys(link))
    }))
    .pipe(GiftLinksResponse);

// The content read resolves a token to its post; only the post id leaves the boundary.
export const toGiftLinkPostResponse = z.object({id: z.string()})
    .transform((post): z.input<typeof GiftLinkPostResponse> => ({
        gift_links: [{post_id: post.id}]
    }))
    .pipe(GiftLinkPostResponse);

export const toRevokeAllResponse = z.object({count: z.number()})
    .transform((data): z.input<typeof RevokeAllResponse> => ({meta: {count: data.count}}))
    .pipe(RevokeAllResponse);
