import createDebug from '@tryghost/debug';
import errors from '@tryghost/errors';
import promiseUtils from '@tryghost/promise';
import type Frame from '../frame.ts';
import type { ApiConfiguration } from '../pipeline.ts';
import * as sharedValidators from './input/index.ts';

const debug = createDebug('validators:handle');
const { IncorrectUsageError } = errors;
type AsyncResult = unknown | Promise<unknown>;
interface Validator {
  (apiConfig: ApiConfiguration, frame: Frame): AsyncResult;
  [name: string]: Validator;
}
type ValidatorRegistry = Record<string, Validator>;

/**
 * @description Shared input validation handler.
 *
 * The shared validation handler runs the request through all the validation steps.
 *
 * 1. Shared validation
 * 2. API validation
 *
 * @param {Object} apiConfig - Docname + method of the ctrl
 * @param {Object} apiValidators - Target API validators
 * @param {import('@tryghost/api-framework').Frame} frame
 */
export const input = (
  apiConfig?: ApiConfiguration,
  apiValidatorsInput?: Record<string, unknown>,
  frame?: Frame,
) => {
  debug('input begin');

  const apiValidators = apiValidatorsInput as ValidatorRegistry;
  const tasks: Array<() => unknown> = [];
  if (!apiValidators || !frame) {
    return Promise.reject(new IncorrectUsageError());
  }

  if (!apiConfig) {
    return Promise.reject(new IncorrectUsageError());
  }

  // ##### SHARED ALL VALIDATION

  tasks.push(function allShared() {
    return sharedValidators.all.all(apiConfig, frame);
  });

  const sharedAll = sharedValidators.all as unknown as Validator;
  const sharedMethod = apiConfig.method ? sharedAll[apiConfig.method] : undefined;
  if (sharedMethod) {
    tasks.push(function allShared() {
      return sharedMethod.call(sharedAll, apiConfig, frame);
    });
  }

  // ##### API VERSION VALIDATION

  const allValidators = apiValidators.all;
  const allMethodValidator = apiConfig.method ? allValidators?.[apiConfig.method] : undefined;
  if (allMethodValidator) {
    tasks.push(function allAPIVersion() {
      return allMethodValidator.call(allValidators, apiConfig, frame);
    });
  }

  const resourceValidators = apiConfig.docName ? apiValidators[apiConfig.docName] : undefined;
  if (resourceValidators) {
    const allResourceValidator = resourceValidators.all;
    if (allResourceValidator) {
      tasks.push(function docNameAll() {
        return allResourceValidator.call(resourceValidators, apiConfig, frame);
      });
    }

    const methodValidator = apiConfig.method ? resourceValidators[apiConfig.method] : undefined;
    if (methodValidator) {
      tasks.push(function docNameMethod() {
        return methodValidator.call(resourceValidators, apiConfig, frame);
      });
    }
  }

  debug('input ready');
  return promiseUtils.sequence(tasks);
};

export default { input };
