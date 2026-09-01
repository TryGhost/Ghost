import { actingContext, definitions } from '../../services/members-custom-fields';

const permissionsService = require('../../services/permissions');

interface Frame {
  // Ghost's API framework rejects a request whose body lacks a non-empty
  // `members_metafields` array before any handler runs, so `edit` can take element 0 without
  // checking.
  data: { members_metafields: unknown[] };
  options: { namespace: string; key: string; context: unknown; [key: string]: unknown };
}

// With `permissions: true` the framework checks against the Bookshelf model named after
// the resource. These fields have no Bookshelf model, so each handler asks the permissions
// service directly.
function canThis(frame: Frame) {
  return permissionsService.canThis(frame.options.context);
}

const noCacheInvalidation = { cacheInvalidate: false };

const controller = {
  docName: 'members_metafields',

  browse: {
    headers: noCacheInvalidation,
    options: ['namespace', 'filter'],
    validation: { options: { namespace: { required: true } } },
    permissions(frame: Frame) {
      return canThis(frame).browse.member_custom_field();
    },
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
    permissions(frame: Frame) {
      return canThis(frame).read.member_custom_field(frame.options.key);
    },
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
      return canThis(frame).add.member_custom_field();
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
      return canThis(frame).edit.member_custom_field();
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
      return canThis(frame).edit.member_custom_field(frame.options.key);
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
      return canThis(frame).destroy.member_custom_field(frame.options.key);
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
