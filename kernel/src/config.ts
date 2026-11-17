import errors from '@tryghost/errors';
import { z } from 'zod';

/**
 * What code is handed when it needs configuration. The application builds the
 * instance; nothing here reads a file or the environment.
 *
 * @see [Foundation types](./README.md#foundation-types)
 */
export interface Config {
  /** The value at a colon-separated key path, or the whole tree. */
  get(key?: string): unknown;
  /**
   * The value at `path`, parsed with `schema`. Throws when it does not fit, so a
   * caller that asks while it starts fails boot on a bad value.
   */
  slice<Schema extends z.ZodType>(path: string, schema: Schema): z.output<Schema>;
}

/**
 * Parses one part of the config with the schema its reader declares.
 *
 * @param value - What config holds at `path`. Missing is treated as empty, so a
 * schema made of defaults accepts a section nobody has configured.
 */
export function parseConfigSlice<Schema extends z.ZodType>(
  value: unknown,
  path: string,
  schema: Schema,
): z.output<Schema> {
  const parsed = schema.safeParse(value ?? {});
  if (!parsed.success) {
    throw new errors.InternalServerError({
      message: `The ${path} config is not valid.`,
      code: 'CONFIG_SLICE_INVALID',
      context: z.prettifyError(parsed.error),
    });
  }
  return parsed.data;
}
