import { z } from 'zod';

/**
 * The longest path an app may report for itself. It ends up in Admin's own address, so it
 * stays well inside what browsers and proxies accept for a whole URL.
 */
export const APP_PATH_MAX_LENGTH = 2048;

// Control characters are stripped or refused unevenly by URL parsers and routers, so a path
// holding one can mean something different to each of them.
const CONTROL_CHARACTER = /\p{Cc}/u;

/**
 * Whether a value is a path within something rather than a way out of it: it starts with a
 * single `/`, so it cannot carry a scheme or be read as `//host`, and it holds no `\`, which
 * URL parsers read as `/`.
 */
export function isContainedPath(value: string): boolean {
  return (
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !CONTROL_CHARACTER.test(value)
  );
}

/**
 * A route within the app's own page, such as `/episodes/12`. Admin mirrors it into its own
 * address under `/apps/:installationId`, so it must not be able to name anything outside it.
 */
export const AppPathSchema = z
  .string('Expected a path')
  .max(APP_PATH_MAX_LENGTH, `Expected a path of at most ${APP_PATH_MAX_LENGTH} characters`)
  .refine(isContainedPath, 'Expected a path within the app, starting with a single /');

export type AppPath = z.infer<typeof AppPathSchema>;

/**
 * How Admin records an app's new path in its history. `replace` is for a redirect within the
 * app, which should not leave an entry the back button returns to.
 */
export const PathChangeOptionsSchema = z.strictObject(
  {
    replace: z.boolean('Expected replace to be true or false').optional(),
  },
  'Expected options such as { replace: true }',
);

export type PathChangeOptions = z.infer<typeof PathChangeOptionsSchema>;
