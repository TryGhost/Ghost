import createDebug from '@tryghost/debug';
import errors from '@tryghost/errors';
import promiseUtils from '@tryghost/promise';
import _ from 'lodash';
import Frame from './frame.ts';
import type { Dictionary, FrameConfiguration } from './frame.ts';
import serializers from './serializers/index.ts';
import validators from './validators/index.ts';

const debug = createDebug('pipeline');
const { IncorrectUsageError } = errors;
const { sequence } = promiseUtils;
type AsyncResult = unknown | Promise<unknown>;
export interface ApiConfiguration extends FrameConfiguration, Dictionary {
  docName?: string;
  method?: string;
}

interface Cache {
  get(key: string, loader: () => Promise<unknown>): Promise<unknown>;
  set(key: string, value: unknown): Promise<unknown>;
}

interface PermissionConfiguration extends Dictionary {
  before?: (frame: Frame) => AsyncResult;
}

export interface ControllerMethod {
  cache?: Cache;
  data?: FrameConfiguration['data'];
  generateCacheKeyData?: (frame: Frame) => AsyncResult;
  headers?: Dictionary;
  options?: FrameConfiguration['options'];
  permissions?: boolean | PermissionConfiguration | ((frame: Frame) => AsyncResult);
  query?: (frame: Frame) => AsyncResult;
  response?: { format: string | (() => string | Promise<string>) };
  statusCode?: number | ((result: unknown) => number);
  validation?: Dictionary | ((frame: Frame) => AsyncResult);
}

type ControllerHandler = ControllerMethod &
  ((dataOrOptions?: Dictionary | Frame, options?: Dictionary | Frame) => Promise<unknown>);

export type Controller = { docName?: string } & Record<
  string,
  ControllerMethod | string | undefined
>;
interface ApiUtils {
  permissions?: { handle(config: Dictionary, frame: Frame): AsyncResult };
  serializers?: { input?: Dictionary; output?: Dictionary };
  validators?: { input?: Dictionary };
}

// Replacer for JSON.stringify that returns every plain object with its keys
// sorted, so the serialized output is deterministic at every depth. Unlike an
// array replacer — which acts as a recursive key whitelist and silently drops
// any key not present in the top-level list — this preserves all nested keys.
function sortKeysReplacer(_key: string, value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const sorted: Dictionary = {};
    const record = value as Dictionary;
    for (const k of Object.keys(record).sort()) {
      sorted[k] = record[k];
    }
    return sorted;
  }
  return value;
}

const STAGES = {
  validation: {
    /**
     * @description Input validation.
     *
     * We call the shared validator which runs the request through:
     *
     * 1. Shared validator
     * 2. Custom API validators
     *
     * @param {Object} apiUtils - Local utils of target API version.
     * @param {Object} apiConfig - Docname & Method of ctrl.
     * @param {import('@tryghost/api-framework').ControllerMethod} apiImpl -  Controller configuration.
     * @param {import('@tryghost/api-framework').Frame} frame
     * @return {Promise}
     */
    input(
      apiUtils: ApiUtils,
      apiConfig: ApiConfiguration,
      apiImpl: ControllerMethod,
      frame: Frame,
    ) {
      debug('stages: validation');
      const tasks = [];

      // CASE: do validation completely yourself
      if (typeof apiImpl.validation === 'function') {
        debug('validation function call');
        return Promise.resolve(apiImpl.validation(frame));
      }

      tasks.push(function doValidation() {
        return validators.handle.input(
          Object.assign({}, apiConfig, apiImpl.validation),
          apiUtils.validators?.input ?? {},
          frame,
        );
      });

      return sequence(tasks);
    },
  },

  serialisation: {
    /**
     * @description Input Serialisation.
     *
     * We call the shared serializer which runs the request through:
     *
     * 1. Shared serializers
     * 2. Custom API serializers
     *
     * @param {Object} apiUtils - Local utils of target API version.
     * @param {Object} apiConfig - Docname & Method of ctrl.
     * @param {import('@tryghost/api-framework').ControllerMethod} apiImpl -  Controller configuration.
     * @param {import('@tryghost/api-framework').Frame} frame
     * @return {Promise}
     */
    input(
      apiUtils: ApiUtils,
      apiConfig: ApiConfiguration,
      apiImpl: ControllerMethod,
      frame: Frame,
    ) {
      debug('stages: input serialisation');
      return serializers.handle.input(
        Object.assign({ data: apiImpl.data }, apiConfig),
        apiUtils.serializers?.input ?? {},
        frame,
      );
    },

    /**
     * @description Output Serialisation.
     *
     * We call the shared serializer which runs the request through:
     *
     * 1. Shared serializers
     * 2. Custom API serializers
     *
     * @param {Object} apiUtils - Local utils of target API version.
     * @param {Object} apiConfig - Docname & Method of ctrl.
     * @param {import('@tryghost/api-framework').ControllerMethod} apiImpl -  Controller configuration.
     * @param {import('@tryghost/api-framework').Frame} frame
     * @return {Promise}
     */
    output(
      response: unknown,
      apiUtils: ApiUtils,
      apiConfig: ApiConfiguration,
      _apiImpl: ControllerMethod,
      frame: Frame,
    ) {
      debug('stages: output serialisation');
      return serializers.handle.output(
        response,
        apiConfig,
        apiUtils.serializers?.output ?? {},
        frame,
      );
    },
  },

  /**
   * @description Permissions stage.
   *
   * We call the target API implementation of permissions.
   * Permissions implementation can change across API versions.
   * There is no shared implementation right now.
   *
   * @param {Object} apiUtils - Local utils of target API version.
   * @param {Object} apiConfig - Docname & Method of ctrl.
   * @param {import('@tryghost/api-framework').ControllerMethod} apiImpl -  Controller configuration.
   * @param {import('@tryghost/api-framework').Frame} frame
   * @return {Promise}
   */
  permissions(
    apiUtils: ApiUtils,
    apiConfig: ApiConfiguration,
    apiImpl: ControllerMethod,
    frame: Frame,
  ) {
    debug('stages: permissions');
    const tasks = [];

    // CASE: it's required to put the permission key to avoid security holes
    if (!Object.prototype.hasOwnProperty.call(apiImpl, 'permissions')) {
      return Promise.reject(new IncorrectUsageError());
    }

    // CASE: handle permissions completely yourself
    if (typeof apiImpl.permissions === 'function') {
      debug('permissions function call');
      return Promise.resolve(apiImpl.permissions(frame));
    }

    // CASE: skip stage completely
    if (apiImpl.permissions === false) {
      debug('disabled permissions');
      return Promise.resolve();
    }

    const permissionConfig =
      typeof apiImpl.permissions === 'object' ? apiImpl.permissions : undefined;
    if (permissionConfig?.before) {
      tasks.push(function beforePermissions() {
        return permissionConfig.before?.(frame);
      });
    }

    tasks.push(function doPermissions() {
      if (!apiUtils.permissions) {
        return Promise.reject(new IncorrectUsageError());
      }
      return apiUtils.permissions.handle(Object.assign({}, apiConfig, apiImpl.permissions), frame);
    });

    return sequence(tasks);
  },

  /**
   * @description Execute controller & receive model response.
   *
   * @param {Object} apiUtils - Local utils of target API version.
   * @param {Object} apiConfig - Docname & Method of ctrl.
   * @param {import('@tryghost/api-framework').ControllerMethod} apiImpl -  Controller configuration.
   * @param {import('@tryghost/api-framework').Frame} frame
   * @return {Promise}
   */
  query(
    _apiUtils: ApiUtils,
    _apiConfig: ApiConfiguration,
    apiImpl: ControllerMethod,
    frame: Frame,
  ) {
    debug('stages: query');

    if (!apiImpl.query) {
      return Promise.reject(new IncorrectUsageError());
    }

    return Promise.resolve(apiImpl.query(frame));
  },
};

const controllerMap = new Map<Controller, Record<string, ControllerHandler>>();
type PipelineResult<T extends Controller> = {
  [K in Exclude<keyof T, 'docName'>]: ControllerHandler;
};

/**
 * @description The pipeline runs the request through all stages (validation, serialisation, permissions).
 *
 * The target API version calls the pipeline and wraps the actual ctrl implementation to be able to
 * run the request through various stages before hitting the controller.
 *
 * The stages are executed in the following order:
 *
 * 1. Input validation - General & schema validation
 * 2. Input serialisation - Modification of incoming data e.g. force filters, auto includes, url transformation etc.
 * 3. Permissions - Runs after validation & serialisation because the body structure must be valid (see unsafeAttrs)
 * 4. Controller - Execute the controller implementation & receive model response.
 * 5. Output Serialisation - Output formatting, Deprecations, Extra attributes etc...
 *
 * @param {import('@tryghost/api-framework').Controller} apiController
 * @param {Object} apiUtils - Local utils (validation & serialisation) from target API version
 * @param {String} [apiType] - Content or Admin API access
 * @return {Object}
 */
const pipeline = <T extends Controller>(
  apiController: T,
  apiUtils: ApiUtils,
  apiType?: string,
): PipelineResult<T> => {
  const cachedController = controllerMap.get(apiController);
  if (cachedController) {
    return cachedController as PipelineResult<T>;
  }

  const keys = Object.keys(apiController).filter((key) => key !== 'docName');
  const docName = apiController.docName;

  // CASE: api controllers are objects with configuration.
  //       We have to ensure that we expose a functional interface e.g. `api.posts.add` has to be available.
  const result = keys.reduce<Record<string, ControllerHandler>>((obj, method) => {
    const apiImpl = _.cloneDeep(apiController)[method] as ControllerMethod;

    Object.freeze(apiImpl.headers);

    const implWrapper = async function ImplWrapper(...args: Array<Dictionary | Frame | undefined>) {
      const apiConfig: ApiConfiguration = { docName, method };
      let options: Dictionary | Frame;
      let data: Dictionary | undefined;
      let frame: Frame;

      if (args.length === 2) {
        data = args[0] as Dictionary;
        options = args[1] ?? {};
      } else if (args.length === 1) {
        options = args[0] || {};
      } else {
        options = {};
      }

      // CASE: http helper already creates it's own frame.
      if (!(options instanceof Frame)) {
        debug(`Internal API request for ${docName}.${method}`);
        frame = new Frame({
          body: data,
          options: _.omit(options, 'context'),
          context: (options.context as Dictionary | undefined) || {},
        });

        frame.configure({
          options: apiImpl.options,
          data: apiImpl.data,
        });
      } else {
        frame = options;
      }

      // CASE: api controller *can* be a single function, but it's not recommended to disable the framework.
      if (typeof apiImpl === 'function') {
        debug('ctrl function call');
        return (apiImpl as ControllerHandler)(frame);
      }

      frame.apiType = apiType;
      frame.docName = docName;
      frame.method = method;

      let cacheKeyData: unknown = frame.options;
      if (apiImpl.generateCacheKeyData) {
        cacheKeyData = await apiImpl.generateCacheKeyData(frame);
      }

      const cacheKey = JSON.stringify(cacheKeyData, sortKeysReplacer);

      if (apiImpl.cache) {
        const response = await apiImpl.cache.get(cacheKey, getResponse);
        if (response) {
          return Promise.resolve(response);
        }
      }

      async function getResponse() {
        await STAGES.validation.input(apiUtils, apiConfig, apiImpl, frame);
        await STAGES.serialisation.input(apiUtils, apiConfig, apiImpl, frame);
        await STAGES.permissions(apiUtils, apiConfig, apiImpl, frame);
        const response = await STAGES.query(apiUtils, apiConfig, apiImpl, frame);
        await STAGES.serialisation.output(response, apiUtils, apiConfig, apiImpl, frame);
        return frame.response;
      }

      const response = await getResponse();

      if (apiImpl.cache) {
        await apiImpl.cache.set(cacheKey, response);
      }

      return response;
    } as ControllerHandler;
    obj[method] = implWrapper;

    Object.assign(implWrapper, apiImpl);
    return obj;
  }, {});

  controllerMap.set(apiController, result);

  return result as PipelineResult<T>;
};

export { STAGES };
export default Object.assign(pipeline, { STAGES });
