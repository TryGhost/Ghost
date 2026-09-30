import type { z } from 'zod';
import type Frame from './frame.ts';
import type { Dictionary } from './frame.ts';
import type { ControllerMethod } from './pipeline.ts';

/** At least one request channel must have a schema. */
export type MethodSchemas =
  | { options: z.ZodType; body?: z.ZodType }
  | { options?: z.ZodType; body: z.ZodType };

type ParsedChannel<Schema> = Schema extends z.ZodType ? z.output<Schema> : undefined;

/** Parsed request channels, independent of the mutable serialization frame. */
export type ValidatedRequest<Schemas extends MethodSchemas> = {
  readonly [
    Channel in keyof Schemas as Channel extends 'options' | 'body' ? Channel : never
  ]: ParsedChannel<Schemas[Channel]>;
};

/** The callback frame once the declared request schemas have been parsed. */
export type ValidatedFrame<Schemas extends MethodSchemas> = Frame & {
  readonly validated: ValidatedRequest<Schemas>;
};

type MethodCallback<Schemas extends MethodSchemas> = (frame: ValidatedFrame<Schemas>) => unknown;

type PermissionConfiguration = Extract<ControllerMethod['permissions'], Dictionary>;

/** Definition contract for a method with schema-derived callback types. */
export type SchemaControllerMethod<Schemas extends MethodSchemas> = Omit<
  ControllerMethod,
  'generateCacheKeyData' | 'permissions' | 'query' | 'validation'
> & {
  schema: Schemas;
  generateCacheKeyData?: MethodCallback<Schemas>;
  permissions:
    | boolean
    | (Omit<PermissionConfiguration, 'before'> & { before?: MethodCallback<Schemas> })
    | MethodCallback<Schemas>;
  query: MethodCallback<Schemas>;
  validation?: MethodCallback<Schemas>;
};

/** Extracts the schema-derived frame type for a separately declared callback. */
export type InferMethodFrame<Method extends { schema: MethodSchemas }> = ValidatedFrame<
  Method['schema']
>;

/**
 * Defines a method without cloning schemas or wrapping callbacks.
 *
 * This is a definition API only. The legacy pipeline cannot execute these
 * callbacks until runtime parsing provides the validated request channels.
 */
export function defineMethod<const Schemas extends MethodSchemas>(
  method: SchemaControllerMethod<Schemas> & {
    schema: Record<Exclude<keyof Schemas, 'options' | 'body'>, never>;
  },
): SchemaControllerMethod<Schemas> {
  return method;
}
