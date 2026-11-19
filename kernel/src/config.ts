/**
 * What code is handed when it needs configuration. A type only: the
 * application builds the instance, and nothing here reads a file or the
 * environment.
 *
 * @see [Foundation types](../README.md#foundation-types)
 */
export interface Config {
  /** The value at a colon-separated key path. */
  get(key: string): unknown;
}
