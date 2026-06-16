import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

// These modules use `module.exports =` / are untyped JS, so they're loaded via
// `require()` (matching their runtime CommonJS shape) rather than ESM imports.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const giftLinks = require('../../services/gift-links') as {
    api: {
        getActive(postId: string, options?: Record<string, unknown>): Promise<unknown>;
        ensure(postId: string, options?: Record<string, unknown>): Promise<unknown>;
        reset(postId: string, options?: Record<string, unknown>): Promise<unknown>;
        resetAll(options?: Record<string, unknown>): Promise<number>;
    };
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const models = require('../../models');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const permissionsService = require('../../services/permissions');

const messages = {
    postNotFound: 'Post not found.',
    notEligible: 'Gift links are only available for published members-only, paid, or tiered posts and pages.'
};

interface PostModel {
    get(key: string): unknown;
}

interface Options {
    context: unknown;
    [key: string]: unknown;
}

interface Frame {
    options: {
        id: string;
        context: unknown;
        [key: string]: unknown;
    };
}

/**
 * Fetch a post/page by id, throwing a 404 if it doesn't exist. `status: 'all'`
 * bypasses the Post model's default published-only filter so we resolve drafts
 * and scheduled posts too (and can give a precise eligibility error elsewhere).
 *
 * @param {string} postId
 * @param {object} options - carries the request context
 */
async function findPostOrThrow(postId: string, options: Options): Promise<PostModel> {
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
async function validateEligiblePost(postId: string, options: Options): Promise<PostModel> {
    const post = await findPostOrThrow(postId, options);

    if (post.get('status') !== 'published' || post.get('visibility') === 'public') {
        throw new errors.ValidationError({message: tpl(messages.notEligible)});
    }

    return post;
}

/**
 * Gift-link management piggybacks on post-edit permission: "you can gift a post
 * iff you can edit it." The role-level `{method: 'manage'}` gift_link permission
 * gates *who* may use these endpoints at all (Author and up), but Authors may
 * only act on their OWN posts. `Post.permissible` already encodes that
 * Author-ownership rule for the `edit` action, so we delegate to it here rather
 * than re-implementing ownership checks. Resolves for privileged roles
 * (Owner/Admin/Editor/Super Editor) and for an Author's own post; rejects with a
 * 403 NoPermissionError for an Author acting on someone else's post. Internal
 * context short-circuits inside the permissions service, so this is a no-op for
 * internal callers (service/e2e setup).
 *
 * @param {string} postId
 * @param {object} options - carries the request context
 */
async function assertCanEditPost(postId: string, options: Options): Promise<void> {
    await permissionsService.canThis(options.context).edit.post(postId);
}

const controller = {
    docName: 'gift_links',

    /**
     * Read the active gift link for a post/page without creating one. Powers
     * management views (returns an empty list when nothing has been shared yet).
     */
    read: {
        // No gift-link action touches the public post cache: the /g/ route is
        // no-store and creating/resetting a link never changes the canonical
        // post, so every action explicitly opts out of cache invalidation.
        headers: {
            cacheInvalidate: false
        },
        options: ['id'],
        validation: {
            options: {
                id: {required: true}
            }
        },
        permissions: {
            method: 'manage'
        },
        async query(frame: Frame) {
            // Lenient on eligibility (read-only state query) but the post must exist.
            await findPostOrThrow(frame.options.id, frame.options);
            // Gift-link management piggybacks on post-edit: Authors only own posts.
            await assertCanEditPost(frame.options.id, frame.options);
            return giftLinks.api.getActive(frame.options.id, {context: frame.options.context});
        }
    },

    /**
     * Idempotently ensure (create-or-get) the active gift link for a post/page.
     * Called by the "copy" action so a row reliably signals a copy.
     */
    ensure: {
        headers: {
            cacheInvalidate: false
        },
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
        async query(frame: Frame) {
            await validateEligiblePost(frame.options.id, frame.options);
            // Gift-link management piggybacks on post-edit: Authors only own posts.
            await assertCanEditPost(frame.options.id, frame.options);
            return giftLinks.api.ensure(frame.options.id, {context: frame.options.context});
        }
    },

    /**
     * Invalidate the active gift link for a post/page and mint a fresh one.
     * Lenient on eligibility (only requires the post to exist): a publisher must
     * be able to rotate a leaked link even after the post became ineligible
     * (e.g. flipped to public or unpublished). See the `validateEligiblePost`
     * note above for why `read` and `reset` share the lenient existence check.
     */
    reset: {
        headers: {
            cacheInvalidate: false
        },
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
        async query(frame: Frame) {
            await findPostOrThrow(frame.options.id, frame.options);
            // Gift-link management piggybacks on post-edit: Authors only own posts.
            await assertCanEditPost(frame.options.id, frame.options);
            return giftLinks.api.reset(frame.options.id, {context: frame.options.context});
        }
    },

    /**
     * Site-wide kill switch: deactivate every active gift link. Tighter
     * permission (resetAll) than per-post manage — backs the danger zone.
     */
    resetAll: {
        headers: {
            cacheInvalidate: false
        },
        statusCode: 200,
        permissions: true,
        async query(frame: Frame) {
            const count = await giftLinks.api.resetAll({context: frame.options.context});
            return {count};
        }
    }
};

// module.exports required - using `export` causes the module to fail to register
// with the web framework as it's loaded via require()
module.exports = controller;
