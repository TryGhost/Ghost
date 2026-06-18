import {service} from '../../services/gift-links';

// permissions is untyped JS; require, don't import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const permissionsService = require('../../services/permissions');

interface Frame {
    options: {
        id: string;
        context: unknown;
        [key: string]: unknown;
    };
}

// Two gates: the gift_link:manage capability AND edit access to the post — you can gift a
// post iff you can edit it.
async function assertCanManageGiftLink(frame: Frame): Promise<void> {
    const {context, id} = frame.options;
    await permissionsService.canThis(context).manage.gift_link(id);
    await permissionsService.canThis(context).edit.post(id);
}

// Gift-link actions never change the post or its public cache.
const noCacheInvalidation = {cacheInvalidate: false};

const controller = {
    docName: 'gift_links',

    /** Read the post's live gift link (empty list when none). */
    read: {
        headers: noCacheInvalidation,
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions(frame: Frame) {
            return assertCanManageGiftLink(frame);
        },
        query(frame: Frame) {
            return service!.getPost(frame.options.id);
        }
    },

    /** Idempotently issue-or-get the live link (the "copy link" action). */
    issue: {
        headers: noCacheInvalidation,
        statusCode: 200,
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions(frame: Frame) {
            return assertCanManageGiftLink(frame);
        },
        query(frame: Frame) {
            return service!.issue(frame.options.id);
        }
    },

    /** Rotate the live link so a leaked token can be invalidated (history retained). */
    reissue: {
        headers: noCacheInvalidation,
        statusCode: 200,
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions(frame: Frame) {
            return assertCanManageGiftLink(frame);
        },
        query(frame: Frame) {
            return service!.reissue(frame.options.id);
        }
    },

    /** Site-wide kill switch: revoke every live link. Gated by the `revokeAll` permission. */
    revokeAll: {
        headers: noCacheInvalidation,
        statusCode: 200,
        permissions: true,
        async query() {
            const count = await service!.revokeAll();
            return {count};
        }
    }
};

// module.exports required - the web framework loads endpoints via require().
module.exports = controller;
