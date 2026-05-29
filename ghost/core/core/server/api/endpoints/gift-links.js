const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const giftLinks = require('../../services/gift-links');
const models = require('../../models');

const messages = {
    postNotFound: 'Post not found.',
    notEligible: 'Gift links are only available for published members-only, paid, or tiered posts and pages.'
};

/**
 * Fetch a post/page by id, throwing a 404 if it doesn't exist. `status: 'all'`
 * bypasses the Post model's default published-only filter so we resolve drafts
 * and scheduled posts too (and can give a precise eligibility error elsewhere).
 *
 * @param {string} postId
 * @param {object} options - carries the request context
 */
async function findPostOrThrow(postId, options) {
    const post = await models.Post.findOne(
        {id: postId, status: 'all'},
        {context: options.context}
    );

    if (!post) {
        throw new errors.NotFoundError({message: tpl(messages.postNotFound)});
    }

    return post;
}

/**
 * Eligibility is enforced here (the API layer), not in the service: a gift link
 * may only be CREATED/RESET for a published, gated (non-public) post or page.
 * The read path is deliberately more lenient (see `read`): it only requires the
 * post to exist, so a publisher can still inspect or reset a link on a post that
 * later became ineligible.
 *
 * @param {string} postId
 * @param {object} options - carries the request context
 */
async function validateEligiblePost(postId, options) {
    const post = await findPostOrThrow(postId, options);

    if (post.get('status') !== 'published' || post.get('visibility') === 'public') {
        throw new errors.ValidationError({message: tpl(messages.notEligible)});
    }

    return post;
}

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'gift_links',

    /**
     * Read the active gift link for a post/page without creating one. Powers
     * management views (returns an empty list when nothing has been shared yet).
     */
    read: {
        options: ['id'],
        validation: {
            options: {
                id: {required: true}
            }
        },
        permissions: {
            method: 'manage'
        },
        async query(frame) {
            // Lenient on eligibility (read-only state query) but the post must exist.
            await findPostOrThrow(frame.options.id, frame.options);
            return giftLinks.api.getActive(frame.options.id, {context: frame.options.context});
        }
    },

    /**
     * Idempotently ensure (create-or-get) the active gift link for a post/page.
     * Called by the "copy" action so a row reliably signals a copy.
     */
    ensure: {
        statusCode: 200,
        options: ['id'],
        validation: {
            options: {
                id: {required: true}
            }
        },
        permissions: {
            method: 'manage'
        },
        async query(frame) {
            await validateEligiblePost(frame.options.id, frame.options);
            return giftLinks.api.ensure(frame.options.id, {context: frame.options.context});
        }
    },

    /**
     * Invalidate the active gift link for a post/page and mint a fresh one.
     */
    reset: {
        statusCode: 200,
        options: ['id'],
        validation: {
            options: {
                id: {required: true}
            }
        },
        permissions: {
            method: 'manage'
        },
        async query(frame) {
            await validateEligiblePost(frame.options.id, frame.options);
            return giftLinks.api.reset(frame.options.id, {context: frame.options.context});
        }
    },

    /**
     * Site-wide kill switch: deactivate every active gift link. Tighter
     * permission (resetAll) than per-post manage — backs the danger zone.
     */
    resetAll: {
        statusCode: 200,
        permissions: true,
        async query(frame) {
            const count = await giftLinks.api.resetAll({context: frame.options.context});
            return {count};
        }
    }
};

module.exports = controller;
