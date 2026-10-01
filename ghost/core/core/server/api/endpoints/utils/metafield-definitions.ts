import { pipeline, type Frame } from '@tryghost/api-framework';
import { z } from 'zod';
import { ADMIN, actingContext, metafieldsFor, type Metafield } from '../../../services/metafields';
import { describeMetafieldEntity } from '../../../services/metafields/entity';
import { assertDefinable } from '../../../services/metafields/namespaces';
import { toMetafieldsResponse } from '../../../services/metafields/serializers';

const localUtils = require('./index');
const permissionsService = require('../../../services/permissions');

// What each handler reads off a request. The framework has already refused one missing a
// required option or a non-empty array under the resource's name, so these only give the
// handlers the types the framework leaves untyped.
const ListOptions = z.object({ namespace: z.string(), filter: z.string().optional() });
const FieldOptions = z.object({ namespace: z.string(), key: z.string() });
const Items = z.array(z.unknown()).min(1);

type Action = 'add' | 'edit' | 'destroy';

const noCacheInvalidation = { cacheInvalidate: false };

/** The resource an entity's definitions are served as, and the key its responses carry them under. */
export function definitionsResource(table: string): string {
  return `${table}_metafields`;
}

/**
 * The Admin API for one entity's metafield definitions.
 *
 * Reading a definition needs no permission. A definition says only that the site collects
 * a shoe size, and every signed-in member is already shown the whole list, so there is
 * nothing here to keep from staff. Defining one is the publisher's own, and with
 * `permissions: true` the framework would check against the Bookshelf model named after
 * the resource — these fields have no Bookshelf model, so each writing handler asks the
 * permissions service directly, about the entity's own definitions.
 *
 * The services are looked up per request, because boot builds them after this is set up.
 */
function definitionsController(table: string) {
  const { definitionResource } = describeMetafieldEntity(table);
  const docName = definitionsResource(table);
  const definitions = () => metafieldsFor(table).definitions;

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
    assertDefinable(ListOptions.parse(frame.options).namespace);
    return permissionsService.canThis(frame.options.context)[action][definitionResource](key);
  }

  return {
    docName,

    browse: {
      headers: noCacheInvalidation,
      options: ['namespace', 'filter'],
      validation: { options: { namespace: { required: true } } },
      permissions: false,
      query(frame: Frame) {
        return definitions().browse(ListOptions.parse(frame.options), ADMIN);
      },
    },

    read: {
      headers: noCacheInvalidation,
      options: ['namespace', 'key'],
      validation: { options: { namespace: { required: true }, key: { required: true } } },
      permissions: false,
      query(frame: Frame) {
        const { namespace, key } = FieldOptions.parse(frame.options);
        return definitions().read(namespace, key, ADMIN);
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
          ListOptions.parse(frame.options).namespace,
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
          ListOptions.parse(frame.options).namespace,
          frame.data[docName],
        );
      },
    },

    edit: {
      headers: noCacheInvalidation,
      options: ['namespace', 'key'],
      validation: { options: { namespace: { required: true }, key: { required: true } } },
      permissions(frame: Frame) {
        return canDefine(frame, 'edit', FieldOptions.parse(frame.options).key);
      },
      query(frame: Frame) {
        const { namespace, key } = FieldOptions.parse(frame.options);
        return definitions().edit(
          actingContext(frame.options.context),
          namespace,
          key,
          Items.parse(frame.data[docName])[0],
        );
      },
    },

    destroy: {
      statusCode: 204,
      headers: noCacheInvalidation,
      options: ['namespace', 'key'],
      validation: { options: { namespace: { required: true }, key: { required: true } } },
      permissions(frame: Frame) {
        return canDefine(frame, 'destroy', FieldOptions.parse(frame.options).key);
      },
      async query(frame: Frame) {
        const { namespace, key } = FieldOptions.parse(frame.options);
        await definitions().destroy(actingContext(frame.options.context), namespace, key);
        return null;
      },
    },
  };
}

type ApiConfig = { docName: string };

const serializeOne = (field: Metafield, apiConfig: ApiConfig, frame: Frame) => {
  frame.response = toMetafieldsResponse(apiConfig.docName, [field]);
};

const serializeMany = (fields: Metafield[], apiConfig: ApiConfig, frame: Frame) => {
  frame.response = toMetafieldsResponse(apiConfig.docName, fields);
};

/** How any entity's definitions are serialized: under the resource the request was for. */
const definitionsSerializer = {
  browse: serializeMany,
  read: serializeOne,
  add: serializeMany,
  reorder: serializeMany,
  edit: serializeOne,
};

/**
 * Ghost's API utilities, with the definitions serializer answering for `docName`. Layered
 * over the shared ones rather than registered among them, so an entity's definitions need
 * no entry in the shared registry, and every other serializer still loads only when used.
 */
export function withDefinitionsSerializer(utils: typeof localUtils, docName: string) {
  const output = Object.create(utils.serializers.output, {
    [docName]: { value: definitionsSerializer, enumerable: true },
  });
  const serializers = Object.create(utils.serializers, { output: { value: output } });
  return Object.create(utils, { serializers: { value: serializers } });
}

/** The Admin API for the metafield definitions of the entity whose records live in `table`. */
export function metafieldDefinitionsApi(table: string) {
  return pipeline(
    definitionsController(table),
    withDefinitionsSerializer(localUtils, definitionsResource(table)),
  );
}
