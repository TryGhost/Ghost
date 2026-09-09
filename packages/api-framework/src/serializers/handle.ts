import createDebug from '@tryghost/debug';
import errors from '@tryghost/errors';
import promiseUtils from '@tryghost/promise';
import type Frame from '../frame.ts';
import type { ApiConfiguration } from '../pipeline.ts';
import * as sharedSerializers from './input/index.ts';

const debug = createDebug('serializers:handle');
const { IncorrectUsageError } = errors;
type AsyncResult = unknown | Promise<unknown>;
interface Serializer {
  (...args: unknown[]): AsyncResult;
  [name: string]: Serializer;
}
type SerializerRegistry = Record<string, Serializer>;

/**
 * @description Shared input serialization handler.
 *
 * The shared input handler runs the request through all the validation steps.
 *
 * 1. Shared serialization
 * 2. API serialization
 *
 * @param {Object} apiConfig - Docname + method of the ctrl
 * @param {Object} apiSerializers - Target API serializers
 * @param {import('@tryghost/api-framework').Frame} frame
 */
export const input = (
  apiConfig?: ApiConfiguration,
  apiSerializersInput?: Record<string, unknown>,
  frame?: Frame,
) => {
  debug('input');

  const apiSerializers = apiSerializersInput as SerializerRegistry;
  const tasks: Array<() => unknown> = [];
  if (!apiConfig) {
    return Promise.reject(new IncorrectUsageError());
  }

  if (!apiSerializers || !frame) {
    return Promise.reject(new IncorrectUsageError());
  }

  // ##### SHARED ALL SERIALIZATION

  tasks.push(function serializeAllShared() {
    return sharedSerializers.all.all(apiConfig, frame);
  });

  const sharedAll = sharedSerializers.all as unknown as Serializer;
  const sharedMethod = apiConfig.method ? sharedAll[apiConfig.method] : undefined;
  if (sharedMethod) {
    tasks.push(function serializeAllShared() {
      return sharedMethod.call(sharedAll, apiConfig, frame);
    });
  }

  // ##### API VERSION RESOURCE SERIALIZATION

  const allSerializer = apiSerializers.all;
  if (allSerializer) {
    tasks.push(function serializeOptionsShared() {
      return allSerializer.call(apiSerializers, apiConfig, frame);
    });
  }

  const resourceSerializers = apiConfig.docName ? apiSerializers[apiConfig.docName] : undefined;
  if (resourceSerializers) {
    const allResourceSerializer = resourceSerializers.all;
    if (allResourceSerializer) {
      tasks.push(function serializeOptionsShared() {
        return allResourceSerializer.call(resourceSerializers, apiConfig, frame);
      });
    }

    const methodSerializer = apiConfig.method ? resourceSerializers[apiConfig.method] : undefined;
    if (methodSerializer) {
      tasks.push(function serializeOptionsShared() {
        return methodSerializer.call(resourceSerializers, apiConfig, frame);
      });
    }
  }

  debug(tasks);
  return promiseUtils.sequence(tasks);
};

const getBestMatchSerializer = function (
  apiSerializersInput: Record<string, unknown>,
  docName?: string,
  method?: string,
) {
  const apiSerializers = apiSerializersInput as SerializerRegistry;
  if (!docName || !method) {
    return false;
  }
  if (apiSerializers[docName]?.[method]) {
    debug(`Calling ${docName}.${method}`);
    return apiSerializers[docName][method].bind(apiSerializers[docName]);
  } else if (apiSerializers[docName]?.all) {
    debug(`Calling ${docName}.all`);
    return apiSerializers[docName].all.bind(apiSerializers[docName]);
  }

  debug(`Returning as-is`);
  return false;
};

/**
 * @description Shared output serialization handler.
 *
 * The shared output handler runs the request through all the validation steps.
 *
 * 1. Shared serialization
 * 2. API serialization
 *
 * @param {Object} response - API response
 * @param {Object} apiConfig - Docname + method of the ctrl
 * @param {Object} apiSerializers - Target API serializers
 * @param {import('@tryghost/api-framework').Frame} frame
 */
export const output = (
  response: unknown = {},
  apiConfig?: ApiConfiguration,
  apiSerializersInput?: Record<string, unknown>,
  frame?: Frame,
) => {
  debug('output');

  const apiSerializers = apiSerializersInput as SerializerRegistry;
  const tasks: Array<() => unknown> = [];

  if (!apiConfig) {
    return Promise.reject(new IncorrectUsageError());
  }

  if (!apiSerializers || !frame) {
    return Promise.reject(new IncorrectUsageError());
  }

  // ##### API VERSION RESOURCE SERIALIZATION

  const allBefore = apiSerializers.all?.before;
  if (allBefore) {
    tasks.push(function allSerializeBefore() {
      return allBefore.call(apiSerializers.all, response, apiConfig, frame);
    });
  }

  const customSerializer = getBestMatchSerializer(
    apiSerializers,
    apiConfig.docName,
    apiConfig.method,
  );
  const defaultSerializer = getBestMatchSerializer(apiSerializers, 'default', apiConfig.method);

  if (customSerializer) {
    // CASE: custom serializer exists
    tasks.push(function doCustomSerializer() {
      return customSerializer(response, apiConfig, frame);
    });
  } else if (defaultSerializer) {
    // CASE: Fall back to default serializer
    tasks.push(function doDefaultSerializer() {
      return defaultSerializer(response, apiConfig, frame);
    });
  }

  const allAfter = apiSerializers.all?.after;
  if (allAfter) {
    tasks.push(function allSerializeAfter() {
      return allAfter.call(apiSerializers.all, apiConfig, frame);
    });
  }

  debug(tasks);
  return promiseUtils.sequence(tasks);
};

export default { input, output };
