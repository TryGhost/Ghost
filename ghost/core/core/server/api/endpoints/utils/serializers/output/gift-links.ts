import {toGiftLinksResponse, toRevokeAllResponse} from '../../../../../services/gift-links/serializers';
import type {Post} from '../../../../../services/gift-links/models';

interface Frame {
    response?: unknown;
}

const serializeGiftLinks = (post: Post, _apiConfig: unknown, frame: Frame): void => {
    frame.response = toGiftLinksResponse.parse(post.giftLinks);
};

// module.exports (not export): the API framework loads serializers via require(). The endpoint ->
// serializer mapping lives here; the response shaping lives with the gift-links service module.
module.exports = {
    browse: serializeGiftLinks,
    ensure: serializeGiftLinks,
    create: serializeGiftLinks,
    removeAll(data: {count: number}, _apiConfig: unknown, frame: Frame): void {
        frame.response = toRevokeAllResponse.parse(data);
    }
};
