import type { Controller, Frame } from '@tryghost/api-framework';
import { ADMIN, actingContext, booted } from '../../services/members-metafields';
import { fieldRoute, namespaceRoute } from '../../services/members-metafields/serializers';

const permissionsService = require('../../services/permissions');

interface MemberMetafieldOptions {
  namespace: string;
  key: string;
  filter?: string;
  context: unknown;
  [key: string]: unknown;
}

type ReadFrame = Frame<{
  options: MemberMetafieldOptions;
}>;

type WriteFrame = Frame<{
  // Ghost's API framework rejects a request whose body lacks a non-empty
  // `members_metafields` array before any handler runs, so `edit` can take element 0 without
  // checking.
  data: { members_metafields: unknown[] };
  options: MemberMetafieldOptions;
}>;

// Reading a definition needs no permission. A definition says only that the site collects
// a shoe size, and every signed-in member is already shown the whole list, so there is
// nothing here to keep from staff. Managing them is the namespace owner's, and with
// `permissions: true` the framework would check against the Bookshelf model named after
// the resource — these fields have no Bookshelf model, so each writing handler asks the
// permissions service directly.

/**
 * Whether the caller may manage the route's namespace, asked of whoever owns it. The
 * namespace is settled first, as which one is being written to decides whose authority
 * applies.
 */
async function canManage(frame: ReadFrame, action: 'add' | 'edit' | 'destroy', key?: string) {
  const { owner } = booted().namespaces.owned(namespaceRoute(frame.options).namespace);
  return permissionsService.canThis(frame.options.context)[action][owner.staff](key);
}

const noCacheInvalidation = { cacheInvalidate: false };

const controller = {
  docName: 'members_metafields',

  browse: {
    headers: noCacheInvalidation,
    options: ['namespace', 'filter'],
    validation: { options: { namespace: { required: true } } },
    permissions: false,
    query(frame: ReadFrame) {
      return booted().definitions.browse(
        { ...namespaceRoute(frame.options), filter: frame.options.filter },
        ADMIN,
      );
    },
  },

  read: {
    headers: noCacheInvalidation,
    options: ['namespace', 'key'],
    validation: { options: { namespace: { required: true }, key: { required: true } } },
    permissions: false,
    query(frame: ReadFrame) {
      const { namespace, key } = fieldRoute(frame.options);
      return booted().definitions.read(namespace, key, ADMIN);
    },
  },

  add: {
    statusCode: 201,
    headers: noCacheInvalidation,
    options: ['namespace'],
    validation: { options: { namespace: { required: true } } },
    permissions(frame: WriteFrame) {
      return canManage(frame, 'add');
    },
    query(frame: WriteFrame) {
      return booted().definitions.add(
        actingContext(frame.options.context),
        namespaceRoute(frame.options).namespace,
        frame.data.members_metafields,
      );
    },
  },

  reorder: {
    headers: noCacheInvalidation,
    options: ['namespace'],
    validation: { options: { namespace: { required: true } } },
    permissions(frame: WriteFrame) {
      return canManage(frame, 'edit');
    },
    query(frame: WriteFrame) {
      return booted().definitions.reorder(
        actingContext(frame.options.context),
        namespaceRoute(frame.options).namespace,
        frame.data.members_metafields,
      );
    },
  },

  edit: {
    headers: noCacheInvalidation,
    options: ['namespace', 'key'],
    validation: { options: { namespace: { required: true }, key: { required: true } } },
    permissions(frame: WriteFrame) {
      return canManage(frame, 'edit', frame.options.key);
    },
    query(frame: WriteFrame) {
      const { namespace, key } = fieldRoute(frame.options);
      return booted().definitions.edit(
        actingContext(frame.options.context),
        namespace,
        key,
        frame.data.members_metafields[0],
      );
    },
  },

  destroy: {
    statusCode: 204,
    headers: noCacheInvalidation,
    options: ['namespace', 'key'],
    validation: { options: { namespace: { required: true }, key: { required: true } } },
    permissions(frame: WriteFrame) {
      return canManage(frame, 'destroy', frame.options.key);
    },
    async query(frame: WriteFrame) {
      const { namespace, key } = fieldRoute(frame.options);
      await booted().definitions.destroy(actingContext(frame.options.context), namespace, key);
      return null;
    },
  },
} satisfies Controller<{
  browse: ReadFrame;
  read: ReadFrame;
  add: WriteFrame;
  reorder: WriteFrame;
  edit: WriteFrame;
  destroy: WriteFrame;
}>;

// The API framework loads this file with `require()`, so it exports CommonJS-style;
// `export default` would not be picked up.
module.exports = controller;
