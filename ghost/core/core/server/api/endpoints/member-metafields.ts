import { isKnownNamespace } from '@tryghost/custom-field-types/identity';
import { actingContext, definitions } from '../../services/members-custom-fields';

const errors = require('@tryghost/errors');
const permissionsService = require('../../services/permissions');

interface Frame {
  // The framework rejects a missing or empty root key with a 400, so on add/edit
  // members_metafields is a non-empty array by the time a query runs. The item's
  // contents stay unknown until the service validates them.
  data: { members_metafields: unknown[] };
  options: { namespace: string; key: string; context: unknown; [key: string]: unknown };
}

// There is no Bookshelf model for this resource, so permissions are checked
// explicitly against the member_custom_field object type (the default
// `permissions: true` handler would try to load a model that doesn't exist).
function canThis(frame: Frame) {
  return permissionsService.canThis(frame.options.context);
}

// Every route carries a namespace segment, and only namespaces that exist resolve —
// today that is `custom` alone. 404 rather than 422: the segment addresses a
// collection, and an unknown namespace is a collection that isn't there.
function assertKnownNamespace(frame: Frame): void {
  if (!isKnownNamespace(frame.options.namespace)) {
    throw new errors.NotFoundError({
      message: 'Metafield namespace not found.',
      property: 'namespace',
    });
  }
}

const noCacheInvalidation = { cacheInvalidate: false };

const controller = {
  docName: 'members_metafields',

  browse: {
    headers: noCacheInvalidation,
    // `filter` narrows by status (the definition list is otherwise small and
    // per-namespace, returned whole). Archived fields are hidden by default; Settings
    // passes `filter=status:[active,archived]` to see both. No pagination or order
    // options: the list comes back in the publisher's own order, which is changed
    // by reordering it rather than by asking for it differently.
    options: ['namespace', 'filter'],
    validation: { options: { namespace: { required: true } } },
    permissions(frame: Frame) {
      return canThis(frame).browse.member_custom_field();
    },
    query(frame: Frame) {
      assertKnownNamespace(frame);
      return definitions!.browse({ filter: frame.options.filter as string | undefined });
    },
  },

  read: {
    headers: noCacheInvalidation,
    options: ['namespace', 'key'],
    validation: { options: { namespace: { required: true }, key: { required: true } } },
    permissions(frame: Frame) {
      return canThis(frame).read.member_custom_field(frame.options.key);
    },
    query(frame: Frame) {
      assertKnownNamespace(frame);
      return definitions!.read(frame.options.key);
    },
  },

  add: {
    statusCode: 201,
    headers: noCacheInvalidation,
    options: ['namespace'],
    validation: { options: { namespace: { required: true } } },
    permissions(frame: Frame) {
      return canThis(frame).add.member_custom_field();
    },
    // The whole array is passed through: create is a batch, applied
    // all-or-nothing. A client sending a single definition (as Admin does)
    // is just the one-item case and sees no change.
    query(frame: Frame) {
      assertKnownNamespace(frame);
      return definitions!.add(actingContext(frame.options.context), frame.data.members_metafields);
    },
  },

  // Order belongs to the list, so it is set by PUTting the list.
  reorder: {
    headers: noCacheInvalidation,
    options: ['namespace'],
    validation: { options: { namespace: { required: true } } },
    permissions(frame: Frame) {
      return canThis(frame).edit.member_custom_field();
    },
    query(frame: Frame) {
      assertKnownNamespace(frame);
      return definitions!.reorder(
        actingContext(frame.options.context),
        frame.data.members_metafields,
      );
    },
  },

  edit: {
    headers: noCacheInvalidation,
    options: ['namespace', 'key'],
    validation: { options: { namespace: { required: true }, key: { required: true } } },
    permissions(frame: Frame) {
      return canThis(frame).edit.member_custom_field(frame.options.key);
    },
    query(frame: Frame) {
      assertKnownNamespace(frame);
      return definitions!.edit(
        actingContext(frame.options.context),
        frame.options.key,
        frame.data.members_metafields[0],
      );
    },
  },

  destroy: {
    statusCode: 204,
    headers: noCacheInvalidation,
    options: ['namespace', 'key'],
    validation: { options: { namespace: { required: true }, key: { required: true } } },
    permissions(frame: Frame) {
      return canThis(frame).destroy.member_custom_field(frame.options.key);
    },
    async query(frame: Frame) {
      assertKnownNamespace(frame);
      await definitions!.destroy(actingContext(frame.options.context), frame.options.key);
      return null;
    },
  },
};

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
