import { actingContext, definitions } from '../../services/members-metafields';
import { assertDefinable } from '../../services/members-metafields/namespaces';

const permissionsService = require('../../services/permissions');

interface Frame {
  // Ghost's API framework rejects a request whose body lacks a non-empty
  // `members_metafields` array before any handler runs, so `edit` can take element 0 without
  // checking.
  data: { members_metafields: unknown[] };
  options: { namespace: string; key: string; context: unknown; [key: string]: unknown };
}

// Reading a definition needs no permission. A definition says only that the site collects
// a shoe size, and every signed-in member is already shown the whole list, so there is
// nothing here to keep from staff. Defining one is the publisher's own, and with
// `permissions: true` the framework would check against the Bookshelf model named after
// the resource — these fields have no Bookshelf model, so each writing handler asks the
// permissions service directly.
function canThis(frame: Frame) {
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
async function canDefine(frame: Frame, action: (frame: Frame) => Promise<unknown>) {
  assertDefinable(frame.options.namespace);
  return action(frame);
}

const noCacheInvalidation = { cacheInvalidate: false };

const controller = {
  docName: 'members_metafields',

  browse: {
    headers: noCacheInvalidation,
    options: ['namespace', 'filter'],
    validation: { options: { namespace: { required: true } } },
    permissions: false,
    query(frame: Frame) {
      return definitions!.browse({
        namespace: frame.options.namespace,
        filter: frame.options.filter as string | undefined,
      });
    },
  },

  read: {
    headers: noCacheInvalidation,
    options: ['namespace', 'key'],
    validation: { options: { namespace: { required: true }, key: { required: true } } },
    permissions: false,
    query(frame: Frame) {
      return definitions!.read(frame.options.namespace, frame.options.key);
    },
  },

  add: {
    statusCode: 201,
    headers: noCacheInvalidation,
    options: ['namespace'],
    validation: { options: { namespace: { required: true } } },
    permissions(frame: Frame) {
      return canDefine(frame, (f) => canThis(f).add.member_custom_field());
    },
    query(frame: Frame) {
      return definitions!.add(
        actingContext(frame.options.context),
        frame.options.namespace,
        frame.data.members_metafields,
      );
    },
  },

  reorder: {
    headers: noCacheInvalidation,
    options: ['namespace'],
    validation: { options: { namespace: { required: true } } },
    permissions(frame: Frame) {
      return canDefine(frame, (f) => canThis(f).edit.member_custom_field());
    },
    query(frame: Frame) {
      return definitions!.reorder(
        actingContext(frame.options.context),
        frame.options.namespace,
        frame.data.members_metafields,
      );
    },
  },

  edit: {
    headers: noCacheInvalidation,
    options: ['namespace', 'key'],
    validation: { options: { namespace: { required: true }, key: { required: true } } },
    permissions(frame: Frame) {
      return canDefine(frame, (f) => canThis(f).edit.member_custom_field(f.options.key));
    },
    query(frame: Frame) {
      return definitions!.edit(
        actingContext(frame.options.context),
        frame.options.namespace,
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
      return canDefine(frame, (f) => canThis(f).destroy.member_custom_field(f.options.key));
    },
    async query(frame: Frame) {
      await definitions!.destroy(
        actingContext(frame.options.context),
        frame.options.namespace,
        frame.options.key,
      );
      return null;
    },
  },
};

// The API framework loads this file with `require()`, so it exports CommonJS-style;
// `export default` would not be picked up.
module.exports = controller;
