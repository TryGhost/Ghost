import { ADMIN, actingContext } from '../../../services/metafields';
import type { MetafieldDefinitionsService } from '../../../services/metafields/definitions-service';
import { assertDefinable } from '../../../services/metafields/namespaces';

const permissionsService = require('../../../services/permissions');

interface Frame {
  // Ghost's API framework rejects a request whose body lacks a non-empty array under the
  // resource's name before any handler runs, so `edit` can take element 0 without checking.
  data: Record<string, unknown[]>;
  options: {
    namespace: string;
    key: string;
    filter?: string;
    context: unknown;
    [key: string]: unknown;
  };
}

type Action = 'add' | 'edit' | 'destroy';

/** The record whose definitions these are, by its table, and what its definitions are called. */
interface DefinitionsOwner {
  table: string;
  /** The permission guarding changes to a definition, and the action log's name for one. */
  definitionResource: string;
}

const noCacheInvalidation = { cacheInvalidate: false };

/**
 * The Admin API for the metafield definitions of one kind of record, such as members.
 *
 * Reading a definition needs no permission. A definition says only that the site collects
 * a shoe size, and every signed-in member is already shown the whole list, so there is
 * nothing here to keep from staff. Defining one is the publisher's own, and with
 * `permissions: true` the framework would check against the Bookshelf model named after
 * the resource — these fields have no Bookshelf model, so each writing handler asks the
 * permissions service directly, about that kind of record's own definitions.
 *
 * `definitions` is a getter because the service is built at boot, after this module loads.
 */
export function metafieldDefinitionsController(
  owner: DefinitionsOwner,
  definitions: () => MetafieldDefinitionsService,
) {
  const docName = `${owner.table}_metafields`;

  /**
   * Settle the namespace before the caller.
   *
   * Which namespace is being written to decides whose authority applies, so it is resolved
   * first; only once the publisher turns out to own it does a staff role become the
   * question. The other order answers a request to define a field somewhere nobody owns
   * with "you lack a permission", which sends the caller after a permission that would not
   * have helped.
   */
  async function canDefine(frame: Frame, action: Action, key?: string) {
    assertDefinable(frame.options.namespace);
    return permissionsService.canThis(frame.options.context)[action][owner.definitionResource](key);
  }

  return {
    docName,

    browse: {
      headers: noCacheInvalidation,
      options: ['namespace', 'filter'],
      validation: { options: { namespace: { required: true } } },
      permissions: false,
      query(frame: Frame) {
        return definitions().browse(
          {
            namespace: frame.options.namespace,
            filter: frame.options.filter,
          },
          ADMIN,
        );
      },
    },

    read: {
      headers: noCacheInvalidation,
      options: ['namespace', 'key'],
      validation: { options: { namespace: { required: true }, key: { required: true } } },
      permissions: false,
      query(frame: Frame) {
        return definitions().read(frame.options.namespace, frame.options.key, ADMIN);
      },
    },

    add: {
      statusCode: 201,
      headers: noCacheInvalidation,
      options: ['namespace'],
      validation: { options: { namespace: { required: true } } },
      permissions(frame: Frame) {
        return canDefine(frame, 'add');
      },
      query(frame: Frame) {
        return definitions().add(
          actingContext(frame.options.context),
          frame.options.namespace,
          frame.data[docName],
        );
      },
    },

    reorder: {
      headers: noCacheInvalidation,
      options: ['namespace'],
      validation: { options: { namespace: { required: true } } },
      permissions(frame: Frame) {
        return canDefine(frame, 'edit');
      },
      query(frame: Frame) {
        return definitions().reorder(
          actingContext(frame.options.context),
          frame.options.namespace,
          frame.data[docName],
        );
      },
    },

    edit: {
      headers: noCacheInvalidation,
      options: ['namespace', 'key'],
      validation: { options: { namespace: { required: true }, key: { required: true } } },
      permissions(frame: Frame) {
        return canDefine(frame, 'edit', frame.options.key);
      },
      query(frame: Frame) {
        return definitions().edit(
          actingContext(frame.options.context),
          frame.options.namespace,
          frame.options.key,
          frame.data[docName][0],
        );
      },
    },

    destroy: {
      statusCode: 204,
      headers: noCacheInvalidation,
      options: ['namespace', 'key'],
      validation: { options: { namespace: { required: true }, key: { required: true } } },
      permissions(frame: Frame) {
        return canDefine(frame, 'destroy', frame.options.key);
      },
      async query(frame: Frame) {
        await definitions().destroy(
          actingContext(frame.options.context),
          frame.options.namespace,
          frame.options.key,
        );
        return null;
      },
    },
  };
}
