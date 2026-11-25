/**
 * Compile-time assertions for the schema-typed `config.get()`.
 *
 * Checked by `pnpm test:types`; there is nothing to run, so this is not a
 * `.test.ts`. Every `@ts-expect-error` below is the assertion - the build fails
 * if the error stops happening.
 */
import type { ConfigInstance } from '../../../../core/shared/config/loader';
import type { ConfigAt, ConfigPath } from '../../../../core/shared/config/schema';

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

// a key under an optional section may be absent with it
const exploreUrl: string | undefined = config.get('explore:update_url');

// @ts-expect-error ...so it is not typed as always present
const exploreUrlPresent: string = config.get('explore:update_url');

// spam blocks are typed, and every block is present
const userLoginRetries: number = config.get('spam:user_login:freeRetries');
const userLoginLifetime: number | undefined = config.get('spam:user_login:lifetime');
const blockedDomains: readonly string[] = config.get('spam:blocked_email_domains');

// @ts-expect-error a block the spam schema does not name
const spamTypo = config.get('spam').user_logn;

// auth is a union on engine
const authEngine: 'legacy' | 'better-auth' = config.get('auth:engine');
const authSection = config.get('auth');

// @ts-expect-error engine is not any string
const authEngineWide: 'legacy' = config.get('auth:engine');

// a union with a key only one option names, as auth gains Better Auth's keys
interface UnionFixture {
  auth:
    | { engine: 'legacy' }
    | { engine: 'better-auth'; sso: { enabled: boolean; provider?: { issuer: string } } };
}

// every option's keys are a path, not only the shared ones
const ssoPath: ConfigPath<UnionFixture> = 'auth:sso:provider:issuer';

// @ts-expect-error a key no option names is not a path
const ssoTypoPath: ConfigPath<UnionFixture> = 'auth:ssso';

// exact type equality, so `unknown` or `any` cannot pass for the right type
type Equal<A, B> =
  (<V>() => V extends A ? 1 : 2) extends <V>() => V extends B ? 1 : 2 ? true : false;

// a key one option lacks resolves to undefined for that option
const ssoEnabled: Equal<ConfigAt<'auth:sso:enabled', UnionFixture>, boolean | undefined> = true;
const ssoIssuer: Equal<
  ConfigAt<'auth:sso:provider:issuer', UnionFixture>,
  string | undefined
> = true;
const fixtureEngine: Equal<ConfigAt<'auth:engine', UnionFixture>, 'legacy' | 'better-auth'> = true;

// @ts-expect-error ...so it is not typed as always present
const ssoEnabledPresent: Equal<ConfigAt<'auth:sso:enabled', UnionFixture>, boolean> = true;

// a key no option names is unknown, as for any key the schema misses
const ssoTypo: Equal<ConfigAt<'auth:ssso', UnionFixture>, unknown> = true;

export {
  authEngine,
  authSection,
  authEngineWide,
  ssoPath,
  ssoTypoPath,
  ssoEnabled,
  ssoIssuer,
  fixtureEngine,
  ssoEnabledPresent,
  ssoTypo,
  userLoginRetries,
  blockedDomains,
  spamTypo,
  userLoginLifetime,
  exploreUrl,
  exploreUrlPresent,
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
