import crypto from 'crypto';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import type {GiftLink} from './gift-link';
import type {GiftLinkRepository} from './gift-link-repository';

const messages = {
    postNotFound: 'Post not found.'
};

interface Options {
    context?: unknown;
    transacting?: unknown;
    [key: string]: unknown;
}

/**
 * Manages the lifecycle of gift links: tokenised links that let anyone read a
 * single post/page, materialised lazily on the first "copy" action.
 *
 * Eligibility (published / gated) is intentionally not enforced here or in the
 * API — the reader path gates redemption through the public content API
 * (published-only), so links are mintable on any existing post. The `<=1 active
 * per post` invariant is deliberately SOFT (see {@link GiftLinkRepository}).
 */
export class GiftLinksService {
    private repository: GiftLinkRepository;

    constructor({giftLinkRepository}: {giftLinkRepository: GiftLinkRepository}) {
        this.repository = giftLinkRepository;
    }

    /**
     * Opaque, URL-safe, >=128-bit random token. No post id is encoded, so a
     * token reveals nothing and cannot be guessed.
     */
    generateToken(): string {
        return crypto.randomBytes(24).toString('base64url');
    }

    // Clean 404 before insert; the `gift_links.post_id` FK is the hard backstop.
    private async assertPostExists(postId: string, options: Options): Promise<void> {
        if (!await this.repository.postExists(postId, options)) {
            throw new errors.NotFoundError({message: tpl(messages.postNotFound)});
        }
    }

    // Lenient on existence: a post with no link (or no such post) has no active link.
    async getActive(postId: string, options: Options = {}): Promise<GiftLink | null> {
        return this.repository.getActiveByPostId(postId, options);
    }

    // Validates a reader's `?key=TOKEN`; used by the frontend /g/ controller.
    async getActiveByToken(token: string, options: Options = {}): Promise<GiftLink | null> {
        return this.repository.getActiveByToken(token, options);
    }

    /** Idempotently return the active link for a post, creating it if absent. */
    async upsert(postId: string, options: Options = {}): Promise<GiftLink> {
        // A link already exists -> return it (an active row proves the post
        // exists, so existence is only checked on the create branch below).
        const existing = await this.repository.getActiveByPostId(postId, options);
        if (existing) {
            return existing;
        }

        await this.assertPostExists(postId, options);

        const created = await this.repository.create(postId, this.generateToken(), options);
        // Converge any link minted by a concurrent upsert, then return whatever
        // is active afterwards: the sweep may have deactivated `created` in
        // favour of a newer row, and the caller must never get an inactive token.
        await this.repository.deactivateAllButMostRecent(postId);
        return (await this.repository.getActiveByPostId(postId, options)) ?? created;
    }

    /**
     * Invalidate the active link (so a leaked token stops working) and mint a
     * fresh one. The old row is retained as `inactive`.
     */
    async reset(postId: string, options: Options = {}): Promise<GiftLink> {
        await this.assertPostExists(postId, options);

        const created = await this.repository.transaction(async (transacting) => {
            const opts: Options = {...options, transacting};
            await this.repository.deactivateActiveByPostId(postId, opts);
            return this.repository.create(postId, this.generateToken(), opts);
        });

        await this.repository.deactivateAllButMostRecent(postId);
        return (await this.repository.getActiveByPostId(postId, options)) ?? created;
    }

    /** Site-wide kill switch: deactivate every active link (re-mint lazily on next copy). */
    async resetAll(options: Options = {}): Promise<number> {
        return this.repository.deactivateAllActive(options);
    }

    /**
     * Bump a link's read counter + last-read time. Bot filtering and client
     * de-duplication happen upstream (see middleware).
     */
    async recordRead(giftLinkId: string): Promise<number> {
        return this.repository.recordRead(giftLinkId);
    }
}
