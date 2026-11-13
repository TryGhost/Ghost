import errors from '@tryghost/errors';
import config from '../../../shared/config';
import { shouldCreateInDevelopmentTables } from '../../data/schema/in-development';

/**
 * Whether Ghost keeps Better Auth's data under either engine (auth:betterAuthDev):
 * boot seeds credential rows from `users.password`. Opt-in, so an install
 * that only has the in-development tables (an old Ghost-CLI local install runs
 * as development) doesn't copy its password hashes into them.
 * Boot's seeder calls this, so a misconfiguration fails boot.
 */
export function usesBetterAuth(): boolean {
  if (config.get('auth:betterAuthDev') !== true) {
    return false;
  }
  if (!shouldCreateInDevelopmentTables()) {
    throw new errors.IncorrectUsageError({
      message:
        'auth:betterAuthDev requires the in-development auth tables, which only exist in development and testing with createInDevelopmentTables enabled.',
      help: 'Set auth:betterAuthDev to false, or enable createInDevelopmentTables in development.',
    });
  }
  return true;
}
