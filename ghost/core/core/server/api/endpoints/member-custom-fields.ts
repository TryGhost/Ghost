import {service, type RequestContext} from '../../services/members-custom-fields';

const permissionsService = require('../../services/permissions');

interface Frame {
    // The framework rejects a missing or empty root key with a 400, so on add/edit
    // member_custom_fields is a non-empty array by the time a query runs. The item's
    // contents stay unknown until the service validates them.
    data: {member_custom_fields: unknown[]};
    options: {id: string; context: unknown; [key: string]: unknown};
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
    docName: 'member_custom_fields',

    browse: {
        headers: noCacheInvalidation,
        // No filter/pagination/order options: the definition list is small and
        // global, and returned whole in a fixed order. (A future sort_order column
        // would change the order server-side, not add a client option.)
        options: [],
        permissions(frame: Frame) {
            return canThis(frame).browse.member_custom_field();
        },
        query() {
            return service!.browse();
        }
    },

    read: {
        headers: noCacheInvalidation,
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions(frame: Frame) {
            return canThis(frame).read.member_custom_field(frame.options.id);
        },
        query(frame: Frame) {
            return service!.read(frame.options.id);
        }
    },

    add: {
        statusCode: 201,
        headers: noCacheInvalidation,
        permissions(frame: Frame) {
            return canThis(frame).add.member_custom_field();
        },
        query(frame: Frame) {
            return service!.add(requestContextFromFrame(frame), frame.data.member_custom_fields[0]);
        }
    },

    edit: {
        headers: noCacheInvalidation,
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions(frame: Frame) {
            return canThis(frame).edit.member_custom_field(frame.options.id);
        },
        query(frame: Frame) {
            return service!.edit(requestContextFromFrame(frame), frame.options.id, frame.data.member_custom_fields[0]);
        }
    },

    destroy: {
        statusCode: 204,
        headers: noCacheInvalidation,
        options: ['id'],
        validation: {options: {id: {required: true}}},
        permissions(frame: Frame) {
            return canThis(frame).destroy.member_custom_field(frame.options.id);
        },
        async query(frame: Frame) {
            await service!.destroy(requestContextFromFrame(frame), frame.options.id);
            return null;
        }
    }
};

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
