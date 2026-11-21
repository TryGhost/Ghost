import type { PipelineController } from './pipeline.ts';

/**
 * Defines a controller without restating each method's frame type.
 *
 * Methods with a `schema` are checked against it, so declare them with
 * `defineMethod()`. Other methods are checked as legacy methods. Returns the
 * controller unchanged.
 */
export function defineController<const T extends { docName: string }>(
  controller: T & PipelineController<T>,
): T {
  return controller;
}
