import {service} from '../../services/gift-links';
import {requestContextFromFrame} from './utils/request-context';

const permissionsService = require('../../services/permissions');

interface Frame {
    options: {
        id: string;
        context: unknown;
        [key: string]: unknown;
    };
}

async function assertCanEditAndGift(frame: Frame): Promise<void> {
    const {context, id} = frame.options;
    await permissionsService.canThis(context).manage.gift_link(id);
    await permissionsService.canThis(context).edit.post(id);
}

const noCacheInvalidation = {cacheInvalidate: false};

const controller = {
    docName: 'gift_links',

    browse: {
        headers: noCacheInvalidation,
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions(frame: Frame) {
            return assertCanEditAndGift(frame);
        },
        query(frame: Frame) {
            return service!.getPost(frame.options.id);
        }
    },

    ensure: {
        headers: noCacheInvalidation,
        statusCode: 200,
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions(frame: Frame) {
            return assertCanEditAndGift(frame);
        },
        query(frame: Frame) {
            return service!.ensure(requestContextFromFrame(frame), frame.options.id);
        }
    },

    create: {
        headers: noCacheInvalidation,
        statusCode: 200,
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions(frame: Frame) {
            return assertCanEditAndGift(frame);
        },
        query(frame: Frame) {
            return service!.create(requestContextFromFrame(frame), frame.options.id);
        }
    },

    removeAll: {
        headers: noCacheInvalidation,
        statusCode: 200,
        permissions(frame: Frame) {
            return permissionsService.canThis(frame.options.context).removeAll.gift_link();
        },
        async query(frame: Frame) {
            const count = await service!.removeAll(requestContextFromFrame(frame));
            return {count};
        }
    }
};

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
