import type { Controller, Frame } from '@tryghost/api-framework';
import type { Identity } from '@tryghost/metafield-types/identity';
import { ADMIN, actingContext, bindings, definitions } from '../../services/members-metafields';
import { assertDefinable } from '../../services/members-metafields/namespaces';
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
// nothing here to keep from staff. Defining one is the publisher's own, and with
// `permissions: true` the framework would check against the Bookshelf model named after
// the resource — these fields have no Bookshelf model, so each writing handler asks the
// permissions service directly.
function canThis(frame: ReadFrame) {
  return permissionsService.canThis(frame.options.context);
}

/**
 * Settle the namespace before the caller.
 *
 * Which namespace is being written to decides whose authority applies, so it is resolved
 * first; only once the publisher turns out to own it does a staff role become the
 * question. The other order answers a request to define a field somewhere nobody owns
 * with "you lack a permission", which sends the caller after a permission that would not
 * have helped.
 */
async function canDefine(frame: ReadFrame, action: (frame: ReadFrame) => Promise<unknown>) {
  assertDefinable(namespaceRoute(frame.options).namespace);
  return action(frame);
}

const noCacheInvalidation = { cacheInvalidate: false };

/**
 * Clears the site's cache when a port writes into the field, as tiers list to anyone the parts
 * their requirements are asked in, and a part is asked only while its field can take a value.
 */
async function invalidateIfBound(frame: WriteFrame, field: Identity): Promise<void> {
  if (await bindings!.isBound(field)) {
    frame.setHeader('X-Cache-Invalidate', '/*');
  }
}

/** Whether an edit archives or restores the field, the only edit that changes what tiers list. */
function setsStatus(input: unknown): boolean {
  return typeof input === 'object' && input !== null && 'status' in input;
}

const controller = {
  docName: 'members_metafields',

  browse: {
    headers: noCacheInvalidation,
    options: ['namespace', 'filter'],
    validation: { options: { namespace: { required: true } } },
    permissions: false,
    query(frame: ReadFrame) {
      return definitions!.browse(
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
      return definitions!.read(namespace, key, ADMIN);
    },
  },

  add: {
    statusCode: 201,
    headers: noCacheInvalidation,
    options: ['namespace'],
    validation: { options: { namespace: { required: true } } },
    permissions(frame: WriteFrame) {
      return canDefine(frame, (f) => canThis(f).add.member_custom_field());
    },
    query(frame: WriteFrame) {
      return definitions!.add(
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
      return canDefine(frame, (f) => canThis(f).edit.member_custom_field());
    },
    query(frame: WriteFrame) {
      return definitions!.reorder(
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
      return canDefine(frame, (f) => canThis(f).edit.member_custom_field(f.options.key));
    },
    async query(frame: WriteFrame) {
      const field = fieldRoute(frame.options);
      const input = frame.data.members_metafields[0];
      const edited = await definitions!.edit(
        actingContext(frame.options.context),
        field.namespace,
        field.key,
        input,
      );
      // Checked after the edit, so a binding made meanwhile still clears the cache.
      if (setsStatus(input)) {
        await invalidateIfBound(frame, field);
      }
      return edited;
    },
  },

  destroy: {
    statusCode: 204,
    headers: noCacheInvalidation,
    options: ['namespace', 'key'],
    validation: { options: { namespace: { required: true }, key: { required: true } } },
    permissions(frame: WriteFrame) {
      return canDefine(frame, (f) => canThis(f).destroy.member_custom_field(f.options.key));
    },
    async query(frame: WriteFrame) {
      const field = fieldRoute(frame.options);
      // Checked before, as deleting the field deletes its bindings.
      await invalidateIfBound(frame, field);
      await definitions!.destroy(actingContext(frame.options.context), field.namespace, field.key);
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
