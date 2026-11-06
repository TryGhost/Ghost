import { shouldCreateInDevelopmentTables } from '../../data/schema/in-development';

/**
 * Whether this database has Better Auth's tables (`user_accounts`,
 * `user_sessions`, `verifications`, `user_two_factors`). They are
 * in-development tables, so they exist wherever those are created; boot adds
 * any that are missing before anything reads them. Goes away when the tables
 * get a migration.
 */
export function hasAuthTables(): boolean {
  return shouldCreateInDevelopmentTables();
}
