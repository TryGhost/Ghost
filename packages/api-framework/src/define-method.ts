import type { z } from 'zod';
import type { default as Frame, Dictionary } from './frame.ts';
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
export type ValidatedFrame<Schemas extends MethodSchemas> = Frame<{
  data: Dictionary;
  options: Dictionary;
}> & {
  readonly validated: ValidatedRequest<Schemas>;
};

type SchemaMethodBase<Schemas extends MethodSchemas> = ControllerMethod<ValidatedFrame<Schemas>>;

/** Definition contract for a method with schema-derived callback types. */
export type SchemaControllerMethod<Schemas extends MethodSchemas> = Omit<
  SchemaMethodBase<Schemas>,
  'permissions' | 'query' | 'validation'
> &
  Required<Pick<SchemaMethodBase<Schemas>, 'permissions' | 'query'>> & {
    schema: Schemas;
    validation?: Exclude<SchemaMethodBase<Schemas>['validation'], Dictionary>;
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
