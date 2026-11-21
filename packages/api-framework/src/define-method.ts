import errors from '@tryghost/errors';
import type { z } from 'zod';
import type { default as Frame, Dictionary } from './frame.ts';
import type { AsyncResult, Cache, ControllerMethod, PermissionConfiguration } from './pipeline.ts';

/** Marks a method created by `defineMethod()`; the pipeline keys off it. */
export const SCHEMA_METHOD = Symbol.for('@tryghost/api-framework/schema-method');

export const TRANSACTION_OPTIONS = ['transacting', 'forUpdate'] as const;

/** Option keys the framework owns, which a schema must not declare. */
export const RESERVED_OPTIONS = ['context', ...TRANSACTION_OPTIONS] as const;

type ObjectSchema = z.ZodObject<z.ZodRawShape, z.core.$ZodObjectConfig>;

/**
 * Request channels. `params` and `query` must be objects so internal options
 * can be routed by key. At least one channel must have a schema. Set `async`
 * when a schema uses async refinements or transforms; sync parsing keeps
 * compiled schemas fast.
 */
export type MethodSchemas = {
  params?: ObjectSchema;
  query?: ObjectSchema;
  body?: z.ZodType;
  async?: boolean;
} & ({ params: ObjectSchema } | { query: ObjectSchema } | { body: z.ZodType });

type Channel = 'params' | 'query' | 'body';

/** Parsed channels: params and query are frozen, the body is readonly-typed only. */
export type ParsedRequest<Schemas extends MethodSchemas> = {
  readonly [
    C in keyof Schemas as C extends Channel
      ? NonNullable<Schemas[C]> extends z.ZodType
        ? C
        : never
      : never
  ]: NonNullable<Schemas[C]> extends z.ZodType
    ? C extends 'body'
      ? z.output<NonNullable<Schemas[C]>>
      : Readonly<z.output<NonNullable<Schemas[C]>>>
    : never;
};

/** DB transaction handles, only ever taken from internal calls. */
export type Transaction = { readonly transacting?: unknown; readonly forUpdate?: boolean };

/** The callback frame once the declared request schemas have been parsed. */
export type SchemaFrame<Schemas extends MethodSchemas> = Omit<Frame, 'options' | 'data'> &
  ParsedRequest<Schemas> & {
    readonly context: Dictionary;
    readonly transaction: Transaction;
    /** Working options after input serializers, plus the transaction, for model calls. */
    readonly modelOptions: Readonly<Dictionary>;
  };

type Callback<TFrame> = (frame: TFrame) => AsyncResult;

/** Definition contract for a method with schema-derived callback types. */
export type SchemaMethodDefinition<Schemas extends MethodSchemas> = {
  schema: Schemas;
  handler: Callback<SchemaFrame<Schemas>>;
  permissions:
    | boolean
    | PermissionConfiguration<SchemaFrame<Schemas>>
    | Callback<SchemaFrame<Schemas>>;
  validation?: Callback<SchemaFrame<Schemas>>;
  generateCacheKeyData?: Callback<SchemaFrame<Schemas>>;
  cache?: Cache;
  headers?: ControllerMethod['headers'];
  response?: ControllerMethod['response'];
  statusCode?: ControllerMethod['statusCode'];
  query?: never;
  options?: never;
  data?: never;
};

export type SchemaControllerMethod<Schemas extends MethodSchemas> =
  SchemaMethodDefinition<Schemas> & { readonly [SCHEMA_METHOD]: true };

/** Extracts the schema-derived frame type for a separately declared callback. */
export type InferMethodFrame<Method extends { schema: MethodSchemas }> = SchemaFrame<
  Method['schema']
>;

type ShapeKeys<Schema> = Schema extends ObjectSchema ? keyof Schema['shape'] : never;
type SharedKeys<Schemas> = Schemas extends { params: infer P; query: infer Q }
  ? Extract<ShapeKeys<P>, ShapeKeys<Q>>
  : never;

type ValidSchemas<Schemas extends MethodSchemas> = Record<
  Exclude<keyof Schemas, Channel | 'async'>,
  never
> &
  Record<
    | SharedKeys<Schemas>
    | Extract<ShapeKeys<Schemas['params']>, (typeof RESERVED_OPTIONS)[number]>
    | Extract<ShapeKeys<Schemas['query']>, (typeof RESERVED_OPTIONS)[number]>,
    never
  >;

const usage = (message: string) => new errors.IncorrectUsageError({ message });

function objectKeys(schema: unknown, channel: string): string[] {
  const def = (schema as { _zod?: { def?: { type?: string } } } | undefined)?._zod?.def;
  if (def?.type !== 'object') {
    throw usage(`schema.${channel} must be a z.object() schema.`);
  }
  return Object.keys((schema as ObjectSchema).shape);
}

function assertDefinition(method: Dictionary) {
  const schema = method.schema as Dictionary | undefined;
  if (!schema || typeof schema !== 'object') {
    throw usage('defineMethod() requires a schema.');
  }
  for (const key of Object.keys(schema)) {
    if (!['params', 'query', 'body', 'async'].includes(key)) {
      throw usage(`Unknown schema channel "${key}".`);
    }
  }
  if (!schema.params && !schema.query && !schema.body) {
    throw usage('defineMethod() requires a params, query or body schema.');
  }
  const params = schema.params ? objectKeys(schema.params, 'params') : [];
  const query = schema.query ? objectKeys(schema.query, 'query') : [];
  for (const key of [...params, ...query]) {
    if ((RESERVED_OPTIONS as readonly string[]).includes(key)) {
      throw usage(`Schemas cannot declare the reserved option "${key}".`);
    }
    if (params.includes(key) && query.includes(key)) {
      throw usage(`"${key}" is declared in both schema.params and schema.query.`);
    }
  }
  for (const key of ['query', 'options', 'data']) {
    if (key in method) {
      throw usage(`Schema methods cannot declare "${key}"; use handler and schema instead.`);
    }
  }
  if (typeof method.handler !== 'function') {
    throw usage('Schema methods require a handler.');
  }
}

export function isSchemaMethod(method: unknown): boolean {
  return Boolean(method && (method as Record<symbol, unknown>)[SCHEMA_METHOD]);
}

/**
 * Defines a method without cloning schemas or wrapping callbacks.
 *
 * The pipeline parses the declared schemas before invoking these callbacks.
 */
export function defineMethod<const Schemas extends MethodSchemas>(
  method: SchemaMethodDefinition<Schemas> & { schema: ValidSchemas<Schemas> },
): SchemaControllerMethod<Schemas> {
  assertDefinition(method as unknown as Dictionary);
  Object.defineProperty(method, SCHEMA_METHOD, { value: true, enumerable: true });
  return method as unknown as SchemaControllerMethod<Schemas>;
}
