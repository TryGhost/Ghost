import { z } from 'zod';

import { ARGUMENT_MESSAGES, isContainedPath, normaliseAppPath } from './rules.ts';

/**
 * The longest path an app may report. Admin puts the path in its own URL, so the limit stays
 * well below what browsers and proxies accept for a whole URL.
 */
export const APP_PATH_MAX_LENGTH = 2048;

/**
 * A route within the app's own page, such as `/episodes/12`. Admin mirrors it in its own URL
 * under `/apps/:installationId`, so it must not be able to point outside that.
 *
 * Parsing accepts only a path, not a URL or `//host`, and returns it normalised by
 * `normaliseAppPath`, with `..` resolved within the app, so it is ready to use.
 */
export const AppPathSchema = z
  .string('Expected a path')
  .max(APP_PATH_MAX_LENGTH, `Expected a path of at most ${APP_PATH_MAX_LENGTH} characters`)
  .refine(isContainedPath, ARGUMENT_MESSAGES.appPath)
  .transform(normaliseAppPath);

export type AppPath = z.output<typeof AppPathSchema>;

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
