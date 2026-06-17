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

// Also requires edit access to the post — you can gift a post only if you can edit it.
async function assertCanManageGiftLink(frame: Frame): Promise<void> {
    const {context, id} = frame.options;
    await permissionsService.canThis(context).manage.gift_link(id);
    await permissionsService.canThis(context).edit.post(id);
}

const noCacheInvalidation = {cacheInvalidate: false};

const controller = {
    docName: 'gift_links',

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

    revokeAll: {
        headers: noCacheInvalidation,
        statusCode: 200,
        permissions(frame: Frame) {
            return permissionsService.canThis(frame.options.context).revokeAll.gift_link();
        },
        async query() {
            const count = await service!.revokeAll();
            return {count};
        }
    }
};

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
