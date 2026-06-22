import {z} from 'zod';
import {GiftLink} from '../../../../../services/gift-links/model';
import type {Post} from '../../../../../services/gift-links/model';

interface Frame {
    response?: unknown;
}

const GiftLinkApiResponse = z.object({
    token: z.string(),
    redeemed_count: z.number(),
    last_redeemed_at: z.date().nullable(),
    created_at: z.date()
});
const GiftLinksResponse = z.object({gift_links: z.array(GiftLinkApiResponse)});

const toGiftLinksResponse = z.array(GiftLink)
    .transform((links): z.input<typeof GiftLinksResponse> => ({
        gift_links: links.map(link => ({
            token: link.token,
            redeemed_count: link.redeemedCount,
            last_redeemed_at: link.lastRedeemedAt,
            created_at: link.createdAt
        }))
    }))
    .pipe(GiftLinksResponse);

// module.exports (not export): the API framework loads serializers via require().
module.exports = {
    read(post: Post, _apiConfig: unknown, frame: Frame) {
        frame.response = toGiftLinksResponse.parse(post.giftLinks);
    },
    issue(post: Post, _apiConfig: unknown, frame: Frame) {
        frame.response = toGiftLinksResponse.parse(post.giftLinks);
    },
    reissue(post: Post, _apiConfig: unknown, frame: Frame) {
        frame.response = toGiftLinksResponse.parse(post.giftLinks);
    },
    revokeAll(data: {count: number}, _apiConfig: unknown, frame: Frame) {
        frame.response = {meta: {count: data.count}};
    }
};
