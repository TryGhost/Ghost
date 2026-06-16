import type {GiftLink} from './gift-link';

export interface RepositoryOptions {
    transacting?: unknown;
}

/**
 * Persistence boundary for gift links — hides Bookshelf/knex, the `gift_links`
 * table and the `posts` relation so the service is testable against this
 * interface rather than model internals.
 *
 * The `<=1 active per post` invariant is deliberately SOFT (no lock, no unique
 * constraint): no consumer needs a hard guarantee, and history retention rules
 * out a cheap unique index. `deactivateAllButMostRecent` converges it and must
 * run AFTER the insert commits — snapshot isolation hides a concurrent sibling.
 */
export interface GiftLinkRepository {
    /** Most-recent active link for a post, or null. */
    getActiveByPostId(postId: string, options?: RepositoryOptions): Promise<GiftLink | null>;
    getActiveByToken(token: string, options?: RepositoryOptions): Promise<GiftLink | null>;
    /** Existence probe for a clean 404; the `post_id` FK is the real backstop. */
    postExists(postId: string, options?: RepositoryOptions): Promise<boolean>;
    /** Insert a fresh active link (id/created_at assigned by the model layer). */
    create(postId: string, token: string, options?: RepositoryOptions): Promise<GiftLink>;
    deactivateActiveByPostId(postId: string, options?: RepositoryOptions): Promise<number>;
    /** Convergence sweep: keep the most-recent active link, deactivate the rest. */
    deactivateAllButMostRecent(postId: string, options?: RepositoryOptions): Promise<void>;
    deactivateAllActive(options?: RepositoryOptions): Promise<number>;
    recordRead(giftLinkId: string): Promise<number>;
    transaction<T>(callback: (transacting: unknown) => Promise<T>): Promise<T>;
}
