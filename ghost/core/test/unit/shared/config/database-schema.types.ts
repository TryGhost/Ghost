/**
 * Compile-time checks that the closed `database:connection` schema matches the
 * mysql2 driver it is handed to.
 *
 * Checked by `pnpm test:types`; there is nothing to run, so this is not a
 * `.test.ts`. A mysql2 upgrade that adds, removes or retypes an option fails
 * here, rather than the schema silently stripping a key the driver now reads.
 */
import type { ConnectionOptions, SslOptions } from 'mysql2';
import type { z } from 'zod';
import type {
  MysqlConnectionKeysNotFromConfig,
  mysqlConnection,
} from '../../../../core/shared/config/schema';

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

type Schema = z.infer<typeof mysqlConnection>;
type SchemaKeys = keyof Schema;

// The schema plus the keys it deliberately leaves out are exactly mysql2's own
// option list - nothing the driver reads is missing, and nothing is invented.
type CoversDriver = Assert<
  Equal<SchemaKeys | MysqlConnectionKeysNotFromConfig, keyof ConnectionOptions>
>;

// A key is either schemafied or excluded, never both.
type NoOverlap = Assert<Equal<SchemaKeys & MysqlConnectionKeysNotFromConfig, never>>;

// Whatever the schema accepts, the driver accepts too.
type DriverAccepts = Assert<Schema extends ConnectionOptions ? true : false>;

// `ssl` as an object mirrors mysql2's SslOptions key for key.
type SslCoversDriver = Assert<
  Equal<keyof Exclude<NonNullable<Schema['ssl']>, string>, keyof SslOptions>
>;

export type { CoversDriver, NoOverlap, DriverAccepts, SslCoversDriver };
