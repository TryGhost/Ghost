const crypto = require('crypto');

/**
 * Manages the lifecycle of gift links: always-on tokenised links that let
 * anyone read a single gated post/page. Links materialise lazily (on the
 * first "copy" action) and there is at most one active link per post.
 *
 * This service is intentionally unaware of eligibility (gated / published) —
 * that is enforced at the API layer. Here we only manage link rows.
 */
class GiftLinksService {
    /**
     * @param {object} deps
     * @param {object} deps.models - Ghost bookshelf models ({GiftLink, Post, Base})
     */
    constructor({models}) {
        this.models = models;
    }

    /**
     * Opaque, URL-safe, >=128-bit random token. No post id is encoded, so a
     * token reveals nothing and cannot be guessed.
     * @returns {string}
     */
    generateToken() {
        return crypto.randomBytes(24).toString('base64url');
    }

    /**
     * Run `operation` inside a transaction, reusing an existing one if the
     * caller already opened it.
     * @template T
     * @param {object} options
     * @param {(options: object) => Promise<T>} operation
     * @returns {Promise<T>}
     */
    async withTransaction(options, operation) {
        if (options.transacting) {
            return operation(options);
        }
        return this.models.Base.transaction(async (transacting) => {
            return operation({...options, transacting});
        });
    }

    /**
     * The active gift link for a post, or null. Never creates a row.
     * @param {string} postId
     * @param {object} [options]
     * @returns {Promise<object|null>}
     */
    async getActive(postId, options = {}) {
        return this.models.GiftLink.findOne(
            {post_id: postId, status: 'active'},
            {...options, require: false}
        );
    }

    /**
     * The active gift link matching a presented token, or null. Used by the
     * frontend /g/ controller to validate the `?key=TOKEN` query param.
     * @param {string} token
     * @param {object} [options]
     * @returns {Promise<object|null>}
     */
    async getActiveByToken(token, options = {}) {
        if (!token) {
            return null;
        }
        return this.models.GiftLink.findOne(
            {token, status: 'active'},
            {...options, require: false}
        );
    }

    /**
     * Idempotently return the active link for a post, creating it if absent.
     * @param {string} postId
     * @param {object} [options]
     * @returns {Promise<object>} the active GiftLink model
     */
    async ensure(postId, options = {}) {
        return this.withTransaction(options, async (opts) => {
            // Lock the post row for the duration of the transaction. MySQL has
            // no partial unique index, so this serialises concurrent
            // ensure/reset for the same post and guarantees <=1 active link
            // even on the very first ensure (when no row exists to lock).
            // require:true also validates the post exists. `status: 'all'`
            // bypasses the Post model's default published-only filter so the
            // lock is eligibility-agnostic (eligibility is the API's concern).
            await this.models.Post.findOne({id: postId, status: 'all'}, {...opts, forUpdate: true, require: true});

            const existing = await this.models.GiftLink.findOne(
                {post_id: postId, status: 'active'},
                {...opts, require: false}
            );
            if (existing) {
                return existing;
            }

            return this.models.GiftLink.add({
                post_id: postId,
                token: this.generateToken(),
                status: 'active'
            }, opts);
        });
    }

    /**
     * Invalidate the current active link (so a leaked token stops working) and
     * mint a fresh one. Counters start at zero on the new row.
     * @param {string} postId
     * @param {object} [options]
     * @returns {Promise<object>} the new active GiftLink model
     */
    async reset(postId, options = {}) {
        return this.withTransaction(options, async (opts) => {
            await this.models.Post.findOne({id: postId, status: 'all'}, {...opts, forUpdate: true, require: true});

            await this.#deactivateActive({post_id: postId}, opts);

            return this.models.GiftLink.add({
                post_id: postId,
                token: this.generateToken(),
                status: 'active'
            }, opts);
        });
    }

    /**
     * Site-wide kill switch: deactivate every active link. Links re-mint
     * lazily on the next copy. Backs the danger-zone action.
     * @param {object} [options]
     * @returns {Promise<number>} number of links deactivated
     */
    async resetAll(options = {}) {
        return this.withTransaction(options, async (opts) => {
            return this.#deactivateActive({}, opts);
        });
    }

    /**
     * Record a (human, de-duped) read against a gift link: bump the counter and
     * stamp the last-read time. Atomic, model-layer-free. Bot filtering and
     * client de-duplication happen before this is called (see middleware).
     * @param {string} giftLinkId
     * @returns {Promise<number>} rows affected (0 if the link no longer exists)
     */
    async recordRead(giftLinkId) {
        const now = new Date();
        return this.models.Base.knex('gift_links')
            .where({id: giftLinkId})
            .update({
                redeemed_count: this.models.Base.knex.raw('redeemed_count + 1'),
                last_redeemed_at: now,
                updated_at: now
            });
    }

    /**
     * Bulk-deactivate active links matching `where`. Bypasses the model layer
     * deliberately so it scales to many rows in a single UPDATE.
     * @param {object} where
     * @param {object} opts
     * @returns {Promise<number>} number of rows affected
     * @private
     */
    async #deactivateActive(where, opts) {
        const query = this.models.Base.knex('gift_links')
            .where({...where, status: 'active'})
            .update({status: 'inactive', updated_at: new Date()});

        if (opts.transacting) {
            query.transacting(opts.transacting);
        }

        return query;
    }
}

module.exports = GiftLinksService;
