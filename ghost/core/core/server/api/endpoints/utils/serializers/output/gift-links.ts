import type {GiftLink} from '../../../../../services/gift-links/gift-link';
import type {Post} from '../../../../../services/gift-links/post';

interface Frame {
    response?: unknown;
}

// Allow-list projection for the API. No id/status: a returned link is by definition live,
// and the token is its identity.
function serialize(link: GiftLink) {
    return {
        token: link.token,
        redeemed_count: link.redeemedCount,
        last_redeemed_at: link.lastRedeemedAt,
        created_at: link.createdAt
    };
}

function project(post: Post): unknown {
    return {gift_links: post.giftLink ? [serialize(post.giftLink)] : []};
}

// module.exports required - the API framework loads serializers via require().
module.exports = {
    read(post: Post, _apiConfig: unknown, frame: Frame) {
        frame.response = project(post);
    },
    issue(post: Post, _apiConfig: unknown, frame: Frame) {
        frame.response = project(post);
    },
    reissue(post: Post, _apiConfig: unknown, frame: Frame) {
        frame.response = project(post);
    },
    revokeAll(data: {count: number}, _apiConfig: unknown, frame: Frame) {
        frame.response = {gift_links: {revoked: data.count}};
    }
};
