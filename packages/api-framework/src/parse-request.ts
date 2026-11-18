import errors from '@tryghost/errors';
import _ from 'lodash';
import type { z } from 'zod';
import type { MethodSchemas, Transaction } from './define-method.ts';
import { TRANSACTION_OPTIONS } from './define-method.ts';
import type { Dictionary, default as Frame } from './frame.ts';

const CHANNELS = ['params', 'query', 'body'] as const;
type Channel = (typeof CHANNELS)[number];
export type ParsedChannels = Partial<Record<Channel, unknown>>;

const FRAME_KEYS = [...CHANNELS, 'context', 'transaction', 'modelOptions'];

function shapeHas(schema: z.ZodType | undefined, key: string) {
  return Boolean(schema && Object.hasOwn((schema as z.ZodObject).shape, key));
}

function define(frame: Frame, key: string, value: unknown) {
  Object.defineProperty(frame, key, { value, enumerable: true, configurable: true });
}

/** Parses request channels before any schema-aware callback or cache lookup. */
export default async function parseRequest(
  schemas: MethodSchemas,
  frame: Frame,
): Promise<ParsedChannels> {
  // A Frame may be reused by internal callers. Never retain an earlier parse.
  for (const key of FRAME_KEYS) {
    Reflect.deleteProperty(frame, key);
  }

  const original = frame.original;
  const context = original.context ?? {};
  const internal = original.options ?? {};
  const input: Record<Channel, unknown> = {
    params: { ...original.params },
    query: { ...original.query },
    body: original.body,
  };
  // Internal callers pass one options object; route each key to the schema
  // declaring it. Undeclared keys are dropped, as an object schema would.
  for (const [key, value] of Object.entries(internal)) {
    if (shapeHas(schemas.params, key)) {
      (input.params as Dictionary)[key] = value;
    } else if (shapeHas(schemas.query, key)) {
      (input.query as Dictionary)[key] = value;
    }
  }

  const parsed: ParsedChannels = {};
  for (const channel of CHANNELS) {
    const schema = schemas[channel];
    if (!schema) {
      continue;
    }
    const result = schemas.async
      ? await schema.safeParseAsync(input[channel])
      : schema.safeParse(input[channel]);
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
    // Models mutate the data they are given, and frozen writes fail silently
    // in sloppy-mode callers, so only params and query are frozen.
    parsed[channel] = channel === 'body' ? result.data : Object.freeze(result.data);
  }

  const transaction: Transaction = Object.freeze(
    context.internal ? _.pick(internal, TRANSACTION_OPTIONS) : {},
  );
  // Working options for serializers, output mappers and permissions; copies so
  // their mutations never reach the parsed channels.
  frame.options = {
    ..._.cloneDeep(parsed.params as Dictionary | undefined),
    ..._.cloneDeep(parsed.query as Dictionary | undefined),
    context,
  };

  for (const channel of CHANNELS) {
    if (schemas[channel]) {
      define(frame, channel, parsed[channel]);
    }
  }
  define(frame, 'context', context);
  define(frame, 'transaction', transaction);
  Object.defineProperty(frame, 'modelOptions', {
    get: () => ({ ...frame.options, ...transaction }),
    configurable: true,
  });

  return parsed;
}
