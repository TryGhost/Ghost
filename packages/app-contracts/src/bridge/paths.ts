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
 * `normaliseAppPath`, with `..` resolved within the app, so it is ready to use. The length is
 * checked before normalising, so a long input isn't normalised at all, and again after, as
 * percent-encoding can make a path up to three times longer.
 */
const tooLong = `Expected a path of at most ${APP_PATH_MAX_LENGTH} characters`;
export const AppPathSchema = z
  .string('Expected a path')
  .max(APP_PATH_MAX_LENGTH, tooLong)
  .refine(isContainedPath, ARGUMENT_MESSAGES.appPath)
  .transform(normaliseAppPath)
  .pipe(z.string().max(APP_PATH_MAX_LENGTH, tooLong));

export type AppPath = z.output<typeof AppPathSchema>;
