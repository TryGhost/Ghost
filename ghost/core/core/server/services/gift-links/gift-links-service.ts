import {generateGiftLinkToken} from './gift-link-token';
import type {Post} from './post';
import type {GiftLinkKnexRepository} from './gift-link-knex-repository';

/**
 * Orchestrates the gift-link lifecycle. Eligibility (published/gated) is intentionally not
 * enforced here — redemption is gated on the reader path — so a link is issuable on any
 * existing post.
 */
export class GiftLinksService {
    private repository: GiftLinkKnexRepository;

    constructor({repository}: {repository: GiftLinkKnexRepository}) {
        this.repository = repository;
    }

    async getPost(postId: string): Promise<Post> {
        return this.repository.getByPostId(postId);
    }

    async getPostByToken(token: string): Promise<Post | null> {
        return this.repository.getByToken(token);
    }

    /** Idempotent "copy link": returns the existing live link, or mints one. */
    async issue(postId: string): Promise<Post> {
        const post = await this.repository.getByPostId(postId);
        return post.giftLink ? post : this.repository.create(post.issue(generateGiftLinkToken()));
    }

    /** Rotate: always mints a fresh link, archiving the previous one. */
    async reissue(postId: string): Promise<Post> {
        const post = await this.repository.getByPostId(postId);
        return this.repository.replace(post.issue(generateGiftLinkToken()));
    }

    /** Site-wide kill switch: revoke every live link (history retained). */
    async revokeAll(): Promise<number> {
        return this.repository.revokeAllActive();
    }

    async recordRedemption(token: string): Promise<number> {
        return this.repository.recordRedemption(token);
    }
}
