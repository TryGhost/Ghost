import errors from '@tryghost/errors';
import _ from 'lodash';
import type { MethodSchemas } from './define-method.ts';
import type Frame from './frame.ts';

/** Parses request channels before any schema-aware callback or cache lookup. */
export default async function parseRequest(schemas: MethodSchemas, frame: Frame) {
  // A Frame may be reused by internal callers. Never retain an earlier parse.
  Reflect.deleteProperty(frame, 'validated');
  const validated: { options?: unknown; body?: unknown } = {};

  for (const channel of ['options', 'body'] as const) {
    const schema = schemas[channel];
    if (!schema) {
      continue;
    }

    const input =
      channel === 'body'
        ? frame.original.body
        : _.omit(
            {
              ...frame.original.query,
              ...frame.original.params,
              ...frame.original.options,
            },
            'context',
          );

    // Unknown/passthrough values and transforms can retain input references.
    // Isolate the parser from the original request and mutable working frame.
    const result = await schema.safeParseAsync(_.cloneDeep(input));
    if (!result.success) {
      throw new errors.ValidationError({
        message: `Validation failed for ${channel}.`,
        property: [channel, ...(result.error.issues[0]?.path ?? [])].join('.'),
        errorDetails: result.error.issues.map((issue) => ({
          ...issue,
          path: [channel, ...issue.path],
        })),
      });
    }
    validated[channel] = result.data;
  }

  Object.defineProperty(frame, 'validated', {
    value: Object.freeze(validated),
    enumerable: true,
    configurable: true,
    writable: false,
  });
  return validated;
}
