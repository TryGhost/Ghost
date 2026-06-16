import type {GiftLinksService} from '../../services/gift-links/gift-links-service';

// The service is a boot singleton on a wrapper exported with `module.exports =`
// (TS can't type a default import of that, and boot/the framework load it via
// raw `require()`), so it's required and cast to the real service type.
// `permissions` is untyped JS and required for the same reason.
/* eslint-disable @typescript-eslint/no-require-imports */
const giftLinks = require('../../services/gift-links') as {service: GiftLinksService};
const permissionsService = require('../../services/permissions');
/* eslint-enable @typescript-eslint/no-require-imports */

interface Frame {
    options: {
        id: string;
        context: unknown;
        [key: string]: unknown;
    };
}

/**
 * Authorise a per-post gift-link action via two gates, both load-bearing:
 *   1. Capability — the role (or Admin Integration) must hold `gift_link:
 *      manage`; this blocks roles (e.g. Contributor) that can edit a post but
 *      may not gift.
 *   2. Ownership — "you can gift a post iff you can edit it." Delegates to
 *      `Post.permissible` (an Author may only act on their own post; 403 else).
 *
 * Internal context short-circuits in the permissions service, so this is a
 * no-op for internal callers.
 */
async function assertCanManageGiftLink(frame: Frame): Promise<void> {
    const {context, id} = frame.options;
    await permissionsService.canThis(context).manage.gift_link(id);
    await permissionsService.canThis(context).edit.post(id);
}

const controller = {
    docName: 'gift_links',

    /** Read the active gift link for a post/page (empty list when none). */
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
        permissions(frame: Frame) {
            return assertCanManageGiftLink(frame);
        },
        query(frame: Frame) {
            return giftLinks.service.getActive(frame.options.id, {context: frame.options.context});
        }
    },

    /**
     * Idempotently create-or-get the active gift link (the "copy" action).
     * Mintable on any existing post — eligibility is enforced at redemption, not
     * here (see the service).
     */
    upsert: {
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
        permissions(frame: Frame) {
            return assertCanManageGiftLink(frame);
        },
        query(frame: Frame) {
            return giftLinks.service.upsert(frame.options.id, {context: frame.options.context});
        }
    },

    /**
     * Rotate the active gift link so a leaked token can be invalidated. History
     * is retained (the old link is kept inactive).
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
        permissions(frame: Frame) {
            return assertCanManageGiftLink(frame);
        },
        query(frame: Frame) {
            return giftLinks.service.reset(frame.options.id, {context: frame.options.context});
        }
    },

    /**
     * Site-wide kill switch: deactivate every active gift link. Tighter
     * permission (`resetAll`) than per-post `manage` — backs the danger zone.
     */
    resetAll: {
        headers: {
            cacheInvalidate: false
        },
        statusCode: 200,
        permissions: true,
        async query(frame: Frame) {
            const count = await giftLinks.service.resetAll({context: frame.options.context});
            return {count};
        }
    }
};

// module.exports required - using `export` causes the module to fail to register
// with the web framework as it's loaded via require()
module.exports = controller;
