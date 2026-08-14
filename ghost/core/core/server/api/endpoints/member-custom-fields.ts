import {definitions, type RequestContext} from '../../services/members-custom-fields';

const permissionsService = require('../../services/permissions');

interface Frame {
    // The framework rejects a missing or empty root key with a 400, so on add/edit
    // members_custom_fields is a non-empty array by the time a query runs. The item's
    // contents stay unknown until the service validates them.
    data: {members_custom_fields: unknown[]};
    options: {key: string; context: unknown; [key: string]: unknown};
}

// There is no Bookshelf model for this resource, so permissions are checked
// explicitly against the member_custom_field object type (the default
// `permissions: true` handler would try to load a model that doesn't exist).
function canThis(frame: Frame) {
    return permissionsService.canThis(frame.options.context);
}

function requestContextFromFrame(frame: Frame): RequestContext {
    const context = (frame.options.context ?? {}) as {user?: string; integration?: {id: string}};
    if (context.integration) {
        return {actor: {id: context.integration.id, type: 'integration'}};
    }
    if (context.user) {
        return {actor: {id: context.user, type: 'user'}};
    }
    return {actor: null};
}

const noCacheInvalidation = {cacheInvalidate: false};

const controller = {
    docName: 'members_custom_fields',

    browse: {
        headers: noCacheInvalidation,
        // `filter` narrows by status (the definition list is otherwise small and
        // global, returned whole in a fixed order). Archived fields are hidden by
        // default; Settings passes `filter=status:[active,archived]` to see both.
        // No pagination/order options — a future sort_order column would change the
        // order server-side, not add a client option.
        options: ['filter'],
        permissions(frame: Frame) {
            return canThis(frame).browse.member_custom_field();
        },
        query(frame: Frame) {
            return definitions!.browse({filter: frame.options.filter as string | undefined});
        }
    },

    read: {
        headers: noCacheInvalidation,
        options: ['key'],
        validation: {options: {key: {required: true}}},
        permissions(frame: Frame) {
            return canThis(frame).read.member_custom_field(frame.options.key);
        },
        query(frame: Frame) {
            return definitions!.read(frame.options.key);
        }
    },

    add: {
        statusCode: 201,
        headers: noCacheInvalidation,
        permissions(frame: Frame) {
            return canThis(frame).add.member_custom_field();
        },
        query(frame: Frame) {
            return definitions!.add(requestContextFromFrame(frame), frame.data.members_custom_fields[0]);
        }
    },

    edit: {
        headers: noCacheInvalidation,
        options: ['key'],
        validation: {options: {key: {required: true}}},
        permissions(frame: Frame) {
            return canThis(frame).edit.member_custom_field(frame.options.key);
        },
        query(frame: Frame) {
            return definitions!.edit(requestContextFromFrame(frame), frame.options.key, frame.data.members_custom_fields[0]);
        }
    },

    destroy: {
        statusCode: 204,
        headers: noCacheInvalidation,
        options: ['key'],
        validation: {options: {key: {required: true}}},
        permissions(frame: Frame) {
            return canThis(frame).destroy.member_custom_field(frame.options.key);
        },
        async query(frame: Frame) {
            await definitions!.destroy(requestContextFromFrame(frame), frame.options.key);
            return null;
        }
    }
};

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
