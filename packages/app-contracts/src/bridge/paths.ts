import { z } from 'zod';

import { isContainedPath } from './rules.ts';

/**
 * The longest path an app may report for itself. It ends up in Admin's own address, so it
 * stays well inside what browsers and proxies accept for a whole URL.
 */
export const APP_PATH_MAX_LENGTH = 2048;

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
