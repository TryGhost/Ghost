/**
 * Compile-time assertions for the schema-typed `config.get()`.
 *
 * Checked by `pnpm test:types`; there is nothing to run, so this is not a
 * `.test.ts`. Every `@ts-expect-error` below is the assertion - the build fails
 * if the error stops happening.
 */
import type { ConfigInstance } from '../../../../core/shared/config/loader';

declare const config: ConfigInstance;

// a key with a schema resolves to its real type
const url: string = config.get('url');
const env: string = config.get('env');

const contentPath: string = config.get('paths:contentPath');

// database is a union on client
const database = config.get('database');
const client: 'mysql2' | 'better-sqlite3' = config.get('database:client');
const host: string | undefined =
  database.client === 'mysql2' ? database.connection.host : undefined;

// @ts-expect-error a sqlite connection has no host
const unnarrowedHost: string | undefined = database.connection.host;

const connection: Record<string, unknown> = config.get('database:connection');

// a key with no schema keeps nconf's `any`, so existing call sites still compile
const logging: number = config.get('logging:level');

// so does a key path built at runtime
declare const dynamic: string;
const fromDynamic: string = config.get(dynamic);

// ...and the whole tree
const whole: unknown = config.get();

// @ts-expect-error a schemafied key is not assignable to the wrong type
const wrongType: number = config.get('url');

// @ts-expect-error the validated view is deeply readonly, like the frozen object
config.validated.url = 'http://nope.test';

// paths is a looseObject, so unknown keys survive at runtime - but the type is
// closed, so a typo on a returned object is caught rather than passing as unknown
const pathsObject: { contentPath: string; migrationPath: string } = config.get('paths');

// @ts-expect-error a key the paths schema does not name
const pathsTypo = config.get('paths').contentPatth;

export {
  url,
  env,
  contentPath,
  database,
  client,
  host,
  unnarrowedHost,
  connection,
  logging,
  fromDynamic,
  whole,
  wrongType,
  pathsObject,
  pathsTypo,
};
