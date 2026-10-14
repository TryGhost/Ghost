import { z } from 'zod';

import { ARGUMENT_MESSAGES, isContainedPath } from './rules.ts';

/**
 * The longest path an app may report for itself. It ends up in Admin's own address, so it
 * stays well inside what browsers and proxies accept for a whole URL.
 */
export const APP_PATH_MAX_LENGTH = 2048;

/**
 * A route within the app's own page, such as `/episodes/12`. Admin mirrors it into its own
 * address under `/apps/:installationId`, so it must not be able to name anything outside it.
 *
 * The schema holds it to a path rather than a URL or `//host`. What keeps it within the app
 * is reading it through `normaliseAppPath`, which resolves `..` against the app's own root, so
 * Admin normalises a path it has parsed before it uses it.
 */
export const AppPathSchema = z
  .string('Expected a path')
  .max(APP_PATH_MAX_LENGTH, `Expected a path of at most ${APP_PATH_MAX_LENGTH} characters`)
  .refine(isContainedPath, ARGUMENT_MESSAGES.appPath);

export type AppPath = z.infer<typeof AppPathSchema>;

/**
 * How Admin records an app's new path in its history. `replace` is for a redirect within the
 * app, which should not leave an entry the back button returns to.
 */
export const PathChangeOptionsSchema = z.strictObject(
  {
    replace: z.boolean('Expected replace to be true or false').optional(),
  },
  ARGUMENT_MESSAGES.pathChangeOptions,
);

export type PathChangeOptions = z.infer<typeof PathChangeOptionsSchema>;
