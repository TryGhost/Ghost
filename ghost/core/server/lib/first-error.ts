/**
 * The error Ghost reads from a thrown value. Ghost's model validation (`validateSchema` in
 * `server/data/schema/validator.ts`) rejects a save with an array of `ValidationError`s, one for
 * each value it refuses, rather than one error. Ghost's convention, which the API's error handler
 * (`@tryghost/mw-error-handler`) follows, is to read such an array as its first error. So an array
 * becomes its first element, and any other thrown value is the error itself.
 */
export function firstError(thrown: unknown): unknown {
  return Array.isArray(thrown) ? thrown[0] : thrown;
}
