import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import _ from 'lodash';
import { z } from 'zod';
import { formatIssues } from '../../../../core/shared/config/report';
import { configSchema } from '../../../../core/shared/config/schema';
import { createConfig, deepFreeze, validateConfig } from '../../../../core/shared/config/validated';
import { configSources } from '../../../utils/config-sources';

const sloppy = require('../../../utils/fixtures/sloppy-config-writer');

const configDir = path.join(__dirname, '../../../../core/shared/config');
const packageRoot = path.resolve(__dirname, '../../../../');

function readJson(...parts: string[]): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(configDir, ...parts), 'utf8'));
}

/**
 * What the loader produced before the schema took over its transforms: driver
 * names for `client`, only that driver's connection keys, absolute paths.
 */
function loaderOutput(tree: Record<string, unknown>): Record<string, unknown> {
  const out = _.cloneDeep(tree) as Record<string, any>;
  const aliases: Record<string, string> = { mysql: 'mysql2', sqlite3: 'better-sqlite3' };
  out.database.client = aliases[out.database.client] ?? out.database.client;
  out.database.connection =
    out.database.client === 'mysql2'
      ? _.omit(out.database.connection, 'filename')
      : _.pick(out.database.connection, 'filename');
  // restated rather than calling makePathsAbsolute, which the schema itself uses
  out.paths = _.mapValues(out.paths, (value) =>
    typeof value === 'string' && (/[/\\]/.test(value) || value === '.') && !path.isAbsolute(value)
      ? path.normalize(path.join(packageRoot, value))
      : value,
  );
  return out;
}

// the smallest tree the schema accepts; `paths` is covered now, so a literal
// here would need restating every time a key lands
const minimal = configSources();

describe('Config Schema', function () {
  describe('parsing the config Ghost ships', function () {
    const defaults = readJson('defaults.json');
    const overrides = readJson('overrides.json');
    const envFiles = fs.readdirSync(path.join(configDir, 'env')).filter((f) => f.endsWith('.json'));

    // Anything this rejects or rewrites differently is config a running Ghost
    // already has. The schema's output must match what the loader used to produce.
    envFiles.forEach(function (file) {
      it(`accepts env/${file} and matches the old loader's output`, function () {
        const merged = _.merge({}, defaults, readJson('env', file), overrides, {
          env: 'testing',
        });

        const result = configSchema.safeParse(_.cloneDeep(merged));

        assert.ok(result.success, result.success ? '' : z.prettifyError(result.error));
        assert.deepEqual(result.data, loaderOutput(merged));
      });
    });

    it('keeps keys that have no schema yet', function () {
      const parsed = configSchema.parse(configSources({ somethingProInjects: { nested: true } }));

      assert.deepEqual(parsed.somethingProInjects, { nested: true });
    });
  });

  describe('paths', function () {
    it('requires every key the shipped config always provides', function () {
      const without = configSources();
      delete (without.paths as Record<string, unknown>).migrationPath;

      const result = configSchema.safeParse(without);

      assert.ok(!result.success);
      assert.match(z.prettifyError(result.error), /paths\.migrationPath/);
    });

    it('rejects a path that is not a string', function () {
      const result = configSchema.safeParse(configSources({ paths: { contentPath: 42 } }));

      assert.ok(!result.success);
      assert.match(z.prettifyError(result.error), /paths\.contentPath/);
    });

    it('accepts an absent installedAdaptersPath, the one key with no default', function () {
      const sources = configSources();
      assert.ok(!('installedAdaptersPath' in (sources.paths as object)));

      const result = configSchema.safeParse(sources);

      assert.ok(result.success, result.success ? '' : z.prettifyError(result.error));
      assert.equal(result.data.paths.installedAdaptersPath, undefined);
    });

    it('keeps installedAdaptersPath when a self-hoster sets it', function () {
      const parsed = configSchema.parse(
        configSources({ paths: { installedAdaptersPath: '/opt/adapters' } }),
      );

      assert.equal(parsed.paths.installedAdaptersPath, '/opt/adapters');
    });

    // `paths` is closed, unlike the top level - so an unlisted key is dropped
    // rather than carried. Nothing reads one, but the silence is the cost of
    // closing it, and a key added to config without its schema disappears.
    it('strips a key it does not name, unlike the loose top level', function () {
      const parsed = configSchema.parse(
        configSources({
          paths: { storage: '/some/adapter.js' },
          somethingProInjects: { nested: true },
        }),
      );

      assert.ok(!('storage' in parsed.paths));
      // the top level keeps its unknown key, which is the contrast
      assert.deepEqual(parsed.somethingProInjects, { nested: true });
    });
  });

  describe('database', function () {
    const mysql = {
      client: 'mysql2',
      connection: { host: '127.0.0.1', user: 'root', password: '', database: 'ghost' },
    };

    // replaced, not merged: configSources' sqlite default would leak `filename`
    function withDatabase(database: unknown) {
      return { ...configSources(), database };
    }

    it('is required, as boot cannot connect without it', function () {
      const result = configSchema.safeParse(withDatabase(undefined));

      assert.ok(!result.success);
      assert.match(formatIssues(result.error.issues), /database/);
    });

    it('accepts both clients as the loader leaves them', function () {
      assert.ok(configSchema.safeParse(withDatabase(mysql)).success);
      assert.ok(configSchema.safeParse(configSources()).success);
    });

    it('normalises the client names config has always used', function () {
      assert.equal(
        configSchema.parse(withDatabase({ ...mysql, client: 'mysql' })).database.client,
        'mysql2',
      );
      assert.equal(
        configSchema.parse(withDatabase({ client: 'sqlite3', connection: { filename: '/a.db' } }))
          .database.client,
        'better-sqlite3',
      );
    });

    it("drops the other client's connection keys", function () {
      const parsed = configSchema.parse(
        withDatabase({ ...mysql, connection: { ...mysql.connection, filename: '/a.db' } }),
      );

      assert.equal('filename' in parsed.database.connection, false);
    });

    it('drops mysql keys from a sqlite connection', function () {
      const parsed = configSchema.parse(
        withDatabase({ client: 'sqlite3', connection: { ...mysql.connection, filename: '/a.db' } }),
      );

      assert.deepEqual(parsed.database.connection, { filename: '/a.db' });
    });

    it('rejects an unsupported client', function () {
      const result = configSchema.safeParse(withDatabase({ ...mysql, client: 'pg' }));

      assert.ok(!result.success);
      assert.match(formatIssues(result.error.issues), /database:client:/);
    });

    it('requires a connection, which knex-migrator and the drivers dereference', function () {
      const result = configSchema.safeParse(withDatabase({ client: 'mysql2' }));

      assert.ok(!result.success);
      assert.match(formatIssues(result.error.issues), /database:connection:/);
    });

    it('accepts the numbers nconf parses out of env vars where the driver does', function () {
      const parsed = configSchema.parse(
        withDatabase({
          ...mysql,
          connection: { ...mysql.connection, port: 3306 },
          pool: { min: 0, max: 5 },
        }),
      );

      assert.equal(parsed.database.client, 'mysql2');
      assert.equal(
        parsed.database.client === 'mysql2' ? parsed.database.connection.port : undefined,
        3306,
      );
      assert.equal(parsed.database.pool?.max, 5);
    });

    it('coerces a quoted port, and leaves a number alone', function () {
      for (const port of ['3306', 3306]) {
        const { database } = configSchema.parse(
          withDatabase({ ...mysql, connection: { ...mysql.connection, port } }),
        );

        assert.equal(database.client === 'mysql2' ? database.connection.port : undefined, 3306);
      }
    });

    ['', 'abc', true, 0, 70000, 3306.5].forEach(function (port) {
      it(`rejects port ${JSON.stringify(port)} rather than coercing it into one`, function () {
        const result = configSchema.safeParse(
          withDatabase({ ...mysql, connection: { ...mysql.connection, port } }),
        );

        assert.ok(!result.success);
        assert.match(formatIssues(result.error.issues), /database:connection:port:/);
      });
    });

    // an all-digit env var parses as a number, which mysql2 rejects
    ['user', 'password', 'database'].forEach(function (key) {
      it(`rejects a ${key} that is not a string, as mysql2 does`, function () {
        const result = configSchema.safeParse(
          withDatabase({ ...mysql, connection: { ...mysql.connection, [key]: 1234 } }),
        );

        assert.ok(!result.success);
        assert.match(formatIssues(result.error.issues), new RegExp(`database:connection:${key}:`));
      });
    });

    it('rejects a filename that is not a string', function () {
      const result = configSchema.safeParse(
        configSources({ database: { connection: { filename: 7 } } }),
      );

      assert.ok(!result.success);
      assert.match(formatIssues(result.error.issues), /database:connection:filename:/);
    });

    it('keeps mysql2 options it does not name', function () {
      const connection = {
        ...mysql.connection,
        ssl: { rejectUnauthorized: false },
        socketPath: '/var/run/mysqld/mysqld.sock',
      };

      const parsed = configSchema.parse(withDatabase({ ...mysql, connection }));

      assert.deepEqual(parsed.database.connection, connection);
    });

    it('accepts ssl: false, which mysql2 reads as disabled', function () {
      const connection = { ...mysql.connection, ssl: false };

      const parsed = configSchema.parse(withDatabase({ ...mysql, connection }));

      assert.deepEqual(parsed.database.connection, connection);
    });

    it('strips everything but filename from a sqlite connection', function () {
      const parsed = configSchema.parse(
        configSources({ database: { connection: { host: '127.0.0.1', mode: 'wal' } } }),
      );

      assert.deepEqual(parsed.database.connection, { filename: '/tmp/ghost-test.db' });
    });

    it('keeps knex options it does not name', function () {
      const parsed = configSchema.parse(
        withDatabase({ ...mysql, acquireConnectionTimeout: 60000 }),
      );

      assert.equal((parsed.database as Record<string, unknown>).acquireConnectionTimeout, 60000);
    });

    it('narrows the connection type on client', function () {
      const { database } = configSchema.parse(withDatabase(mysql));

      assert.equal(database.client, 'mysql2');
      if (database.client === 'mysql2') {
        assert.equal(database.connection.host, '127.0.0.1');
      }
    });
  });

  describe('spam', function () {
    const withSpam = (spam: Record<string, unknown>) =>
      configSources({ spam: _.merge({}, readJson('defaults.json').spam, spam) });

    it('requires every block, as defaults.json supplies them all', function () {
      const tree = configSources();
      delete (tree.spam as Record<string, unknown>).user_login;

      assert.ok(configSchema.safeParse(tree).error);
    });

    it('rejects a minWait that is not a number', function () {
      const result = configSchema.safeParse(withSpam({ user_login: { minWait: '600000' } }));

      assert.deepEqual(result.error?.issues[0]?.path, ['spam', 'user_login', 'minWait']);
    });

    it('rejects a limiter value that is not a non-negative integer', function () {
      for (const freeRetries of [1.5, -1]) {
        const result = configSchema.safeParse(withSpam({ user_login: { freeRetries } }));

        assert.deepEqual(result.error?.issues[0]?.path, ['spam', 'user_login', 'freeRetries']);
      }
    });

    it('requires freeRetries, minWait and maxWait, but not lifetime', function () {
      const tree = configSources();
      const block = (tree.spam as Record<string, Record<string, unknown>>).user_reset;
      delete block.lifetime;
      assert.ok(configSchema.safeParse(tree).success);

      delete block.maxWait;
      const result = configSchema.safeParse(tree);
      assert.deepEqual(result.error?.issues[0]?.path, ['spam', 'user_reset', 'maxWait']);
    });

    it('rejects blocked_email_domains that are not strings', function () {
      assert.ok(configSchema.safeParse(withSpam({ blocked_email_domains: [42] })).error);
    });

    describe('unknown keys', function () {
      const typo = () => withSpam({ user_logn: { freeRetries: 1 }, user_login: { minwait: 1 } });

      afterEach(function () {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
      });

      it('fails the parse on an unknown block under test', function () {
        for (const env of ['testing', 'testing-mysql']) {
          vi.stubEnv('NODE_ENV', env);
          const issues = configSchema.safeParse(typo()).error?.issues;

          assert.deepEqual(
            issues?.map((issue) => ({
              code: issue.code,
              path: issue.path,
              keys: 'keys' in issue && issue.keys,
            })),
            [{ code: 'unrecognized_keys', path: ['spam'], keys: ['user_logn'] }],
          );
        }
      });

      for (const env of ['development', 'production']) {
        it(`warns on an unknown block in ${env}, then strips it`, function () {
          vi.stubEnv('NODE_ENV', env);
          const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

          const parsed = configSchema.parse(typo());

          assert.ok(!('user_logn' in parsed.spam));
          assert.match(String(warn.mock.calls[0]?.[0]), /spam:user_logn/);
        });
      }

      it('only warns under GHOST_CONFIG_SCHEMA_STRICT', function () {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('GHOST_CONFIG_SCHEMA_STRICT', 'true');
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        assert.ok(configSchema.safeParse(typo()).success);
      });

      it('still reports an unknown block when a limiter value is invalid', function () {
        vi.stubEnv('NODE_ENV', 'production');
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const tree = withSpam({ user_logn: { freeRetries: 1 }, user_login: { minWait: 'x' } });
        const config = validateConfig({ ...tree, env: 'production' });

        assert.ok(!('user_logn' in config.spam));
        assert.match(String(warn.mock.calls[0]?.[0]), /spam:user_logn/);
      });

      it('strips an unknown limiter key without reporting it', function () {
        const warn = vi.spyOn(console, 'warn');
        const parsed = configSchema.parse(withSpam({ user_login: { minwait: 1 } }));

        assert.ok(!('minwait' in parsed.spam.user_login));
        assert.equal(warn.mock.calls.length, 0);
      });
    });
  });

  describe('url', function () {
    it('requires a protocol, matching the long-standing boot check', function () {
      assert.ok(configSchema.safeParse(configSources({ url: 'my-ghost-blog.com' })).error);
      assert.ok(configSchema.safeParse(configSources({ url: 'http://my-ghost-blog.com' })).success);
    });
  });
});

describe('Validated Config', function () {
  describe('deepFreeze', function () {
    it('freezes nested objects and arrays', function () {
      const frozen = deepFreeze({ a: { b: [{ c: 1 }] } });

      assert.ok(Object.isFrozen(frozen.a));
      assert.ok(Object.isFrozen(frozen.a.b));
      assert.ok(Object.isFrozen(frozen.a.b[0]));
    });

    it('tolerates cycles', function () {
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;

      assert.ok(Object.isFrozen(deepFreeze(cyclic)));
    });
  });

  describe('validateConfig', function () {
    // in hooks, so a failing assertion can't leave GHOST_CONFIG_SCHEMA_STRICT
    // set or console.error mocked for every later test
    afterEach(function () {
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
    });

    it('refuses writes, by throwing under the guard', function () {
      // stubbed rather than inherited: the guard is on by default under test,
      // but a developer may have GHOST_CONFIG_GUARD exported - see ./guard.test.ts
      vi.stubEnv('GHOST_CONFIG_GUARD', 'true');

      const validated = validateConfig(configSources({ paths: { contentPath: '/a' } }));

      assert.throws(() => sloppy.write(validated.paths, 'contentPath', '/b'), /read-only/);
    });

    it('deep-freezes instead where the guard is off, as production does', function () {
      vi.stubEnv('GHOST_CONFIG_GUARD', 'false');

      const validated = validateConfig(configSources({ paths: { contentPath: '/a' } }));

      assert.ok(Object.isFrozen(validated));
      assert.ok(Object.isFrozen(validated.paths));
    });

    it('throws outside production when the config is invalid', function () {
      assert.throws(
        () => validateConfig(configSources({ url: 'no-protocol' })),
        /Ghost config failed validation/,
      );
    });

    it('names each invalid key by its nconf key path', function () {
      const without = configSources();
      delete (without.paths as Record<string, unknown>).migrationPath;

      assert.throws(() => validateConfig(without), /\n {2}paths:migrationPath: /);
    });

    it('throws for testing-mysql too, matching isTestEnv()', function () {
      assert.throws(() => validateConfig(configSources({ env: 'testing-mysql', url: 'nope' })));
    });

    // a live site's boot must not depend on this repo having got the schema
    // right, and an embedder picks its own NODE_ENV
    ['production', 'staging', 'whatever-an-embedder-picked'].forEach(function (env) {
      it(`warns instead of throwing in ${env}`, function () {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        const validated = validateConfig(configSources({ env, auth: { engine: 'nope' } }));

        assert.equal(validated.auth.engine, 'nope');
        assert.match(error.mock.calls[0][0] as string, /not enforced[^]*auth:engine: /);
      });
    });

    it('keeps one bad key from costing the rest of the tree its transforms', function () {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const validated = validateConfig(
        configSources({
          env: 'production',
          auth: { engine: 'nope' },
          database: { client: 'sqlite3', connection: { filename: '/a.db' } },
        }),
      );

      assert.ok(path.isAbsolute(validated.paths.migrationPath));
      assert.equal(validated.database.client, 'better-sqlite3');
    });

    it('throws for a fatal key in every environment', function () {
      assert.throws(
        () => validateConfig(configSources({ env: 'production', url: 'no-protocol' })),
        /url: URL in config must be provided with protocol/,
      );
    });

    it('throws for a fatal key even when GHOST_CONFIG_SCHEMA_STRICT is false', function () {
      vi.stubEnv('GHOST_CONFIG_SCHEMA_STRICT', 'false');

      assert.throws(
        () => validateConfig(configSources({ env: 'development', url: 'no-protocol' })),
        /url: URL in config must be provided with protocol/,
      );
    });

    it('logs instead of throwing for a missing or null transformed section', function () {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});

      const validated = validateConfig(
        configSources({
          env: 'production',
          paths: null,
          database: { client: 'mysql', connection: null },
        }),
      );

      assert.equal(validated.paths, null);
      assert.equal(validated.database.connection, null);
      assert.match(
        error.mock.calls[0][0] as string,
        /\n {2}paths: [^]*\n {2}database:connection: /,
      );
    });

    it('is forced strict by GHOST_CONFIG_SCHEMA_STRICT', function () {
      vi.stubEnv('GHOST_CONFIG_SCHEMA_STRICT', 'true');

      assert.throws(
        () => validateConfig(configSources({ env: 'staging', auth: { engine: 'nope' } })),
        /Ghost config failed validation:\n {2}auth:engine: /,
      );
    });

    it('is forced lenient by GHOST_CONFIG_SCHEMA_STRICT', function () {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.stubEnv('GHOST_CONFIG_SCHEMA_STRICT', 'false');

      assert.equal(
        validateConfig(configSources({ env: 'development', auth: { engine: 'nope' } })).auth.engine,
        'nope',
      );
    });
  });

  describe('createConfig', function () {
    afterEach(function () {
      vi.unstubAllEnvs();
    });

    it('reads key paths out of the frozen tree', function () {
      const config = createConfig(configSources({ paths: { contentPath: '/a' } }));

      assert.equal(config.get('url'), 'http://localhost:2368');
      assert.equal(config.get('paths:contentPath'), '/a');
      // a key the test did not pin still arrives, layered out of overrides.json
      assert.ok(config.get('paths:migrationPath').endsWith('core/server/data/migrations'));
      assert.ok(path.isAbsolute(config.get('paths:migrationPath')));
    });

    it('makes every key read-only, not only the ones with a schema', function () {
      vi.stubEnv('GHOST_CONFIG_GUARD', 'true');

      const config = createConfig(configSources({ storage: { active: 'local-storage' } }));

      // the schema is loose, so an unlisted key is validated and protected too -
      // that is what makes the whole config immutable
      assert.throws(() => sloppy.write(config.get('paths'), 'contentPath', '/b'), /read-only/);
      assert.throws(() => sloppy.write(config.get('storage'), 'active', 'other'), /read-only/);
      assert.throws(() => sloppy.write(config.get(), 'url', 'http://nope.test'), /read-only/);
    });

    it('returns undefined for a path that is not there', function () {
      const config = createConfig(minimal);

      assert.equal(config.get('nope'), undefined);
      assert.equal(config.get('url:nope'), undefined);
    });

    it('does not freeze the sources it was handed', function () {
      const sources = configSources({ paths: { contentPath: '/a' } });

      createConfig(sources);
      (sources.paths as Record<string, unknown>).contentPath = '/b';

      assert.equal((sources.paths as Record<string, unknown>).contentPath, '/b');
    });

    it('rebuilds atomically on set, so config is never half-written', function () {
      const config = createConfig(minimal);

      config.set('url', 'http://elsewhere.test');

      assert.equal(config.get('url'), 'http://elsewhere.test');
      assert.equal(config.getSiteUrl(), 'http://elsewhere.test/');
    });

    it('keeps earlier overrides when a later one is set', function () {
      const config = createConfig(configSources({ paths: { contentPath: '/a' } }));

      config.set('paths:contentPath', '/b');
      config.set('url', 'http://elsewhere.test');

      assert.equal(config.get('paths:contentPath'), '/b');
      assert.equal(config.get('url'), 'http://elsewhere.test');
    });

    it('does not freeze the value it was handed', function () {
      const config = createConfig(minimal);
      const value = { active: 'local-storage' };

      config.set('storage', value);
      value.active = 'changed-after-the-fact';

      assert.equal(value.active, 'changed-after-the-fact');
      assert.equal(config.get('storage:active'), 'local-storage');
    });

    it('forgets an override that failed validation', function () {
      const config = createConfig(minimal);

      assert.throws(() => config.set('url', 'no-protocol'));

      // the rejected value must not linger, or this would throw too
      config.set('storage', { active: 'local-storage' });

      assert.equal(config.get('url'), 'http://localhost:2368');
      assert.equal(config.get('storage:active'), 'local-storage');
    });

    it('replays overrides in write order, so the latest wins', function () {
      const config = createConfig(configSources({ storage: { active: 'base' } }));

      // a Map keeps an existing key's original position on set, which would let
      // the first write of `storage:active` replay before `storage` and lose
      config.set('storage:active', 'first');
      config.set('storage', { active: 'second' });
      config.set('storage:active', 'last');

      assert.equal(config.get('storage:active'), 'last');
    });

    it('lets a parent override replace a child written earlier', function () {
      const config = createConfig(configSources({ storage: { active: 'base' } }));

      config.set('storage:active', 'first');
      config.set('storage', { active: 'second' });

      assert.equal(config.get('storage:active'), 'second');
    });

    it('keeps write order when a rejected override is rolled back', function () {
      const config = createConfig(configSources({ storage: { active: 'base' } }));

      config.set('storage:active', 'first');
      config.set('storage', { active: 'second' });
      config.set('storage:active', 'last');

      assert.throws(() => config.set('url', 'no-protocol'));

      assert.equal(config.get('storage:active'), 'last');
    });

    it('keeps earlier overrides when the value cannot be cloned', function () {
      const config = createConfig(configSources({ paths: { contentPath: '/base' } }));
      config.set('paths:contentPath', '/kept');

      // cloneDeep throws on this; nothing may be recorded or dropped before it
      const unclonable = Object.defineProperty({}, 'x', {
        get() {
          throw new Error('boom');
        },
        enumerable: true,
      });

      assert.throws(() => config.set('paths:contentPath', unclonable), /boom/);
      assert.equal(config.get('paths:contentPath'), '/kept');

      // the override has to survive the next rebuild too
      config.set('url', 'http://elsewhere.test');
      assert.equal(config.get('paths:contentPath'), '/kept');
    });

    it('clears a leaf of an object set earlier, which is what callers do', function () {
      const config = createConfig(configSources({ tinybird: {} }));

      config.set('tinybird', { tracker: { token: 'secret', endpoint: '/e' } });
      config.set('tinybird:tracker:token', undefined);

      assert.equal(config.get('tinybird:tracker:token'), undefined);
      assert.equal(config.get('tinybird:tracker:endpoint'), '/e');
    });

    // guarded and unguarded config must answer identically: the guard exists to
    // make a write loud, not to change what config does
    for (const guard of ['true', 'false']) {
      it(`leaves an already-returned object alone on a nested set, guard=${guard}`, function () {
        vi.stubEnv('GHOST_CONFIG_GUARD', guard);
        const config = createConfig(minimal);

        config.set('storage', { active: 'first' });
        const previous = config.get('storage');
        config.set('storage:active', 'second');

        assert.equal(previous.active, 'first');
        assert.equal(config.get('storage:active'), 'second');
      });
    }

    it('drops every override on reset', function () {
      const config = createConfig(minimal);
      config.set('url', 'http://elsewhere.test');

      config.reset();

      assert.equal(config.get('url'), 'http://localhost:2368');
    });

    it('binds the url and content-path helpers', function () {
      const config = createConfig(configSources({ paths: { contentPath: '/a/' } }));

      assert.equal(config.getSiteUrl(), 'http://localhost:2368/');
      assert.equal(config.getContentPath('images'), '/a/images/');
      assert.ok(config.isTestEnv());
    });
  });
});
