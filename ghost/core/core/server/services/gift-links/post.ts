import type {GiftLink} from './gift-link';
import type {GiftLinkToken} from './gift-link-token';

/**
 * The gift-links domain's own Post — not the Bookshelf Post model. Owns zero or one live
 * gift link; transitions return a new instance.
 */
export class Post {
    readonly id: string;
    readonly giftLink: GiftLink | null;

    constructor(id: string, giftLink: GiftLink | null = null) {
        this.id = id;
        this.giftLink = giftLink;
    }

    issue(token: GiftLinkToken): Post {
        return new Post(this.id, mint(token));
    }
}

function mint(token: GiftLinkToken): GiftLink {
    return {token, redeemedCount: 0, lastRedeemedAt: null, createdAt: new Date()};
}
