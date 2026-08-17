import {z} from 'zod';
import {snakeKeys} from '../../lib/case-keys';
import {GiftLink} from './models';

const GiftLinkResource = z.object({
    token: z.string(),
    created_at: z.date()
});
const GiftLinksResponse = z.object({gift_links: z.array(GiftLinkResource)});
const RevokeAllResponse = z.object({meta: z.object({count: z.number()})});

export const toGiftLinksResponse = z.array(GiftLink)
    .transform((links): z.input<typeof GiftLinksResponse> => ({
        gift_links: links.map(link => snakeKeys(link))
    }))
    .pipe(GiftLinksResponse);

export const toRevokeAllResponse = z.object({count: z.number()})
    .transform((data): z.input<typeof RevokeAllResponse> => ({meta: {count: data.count}}))
    .pipe(RevokeAllResponse);
