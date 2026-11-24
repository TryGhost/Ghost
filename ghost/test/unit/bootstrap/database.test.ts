import assert from 'node:assert/strict';
import os from 'node:os';
import { databaseOptions } from '../../../bootstrap/database-options';
import { buildDatabase } from '../../../bootstrap/database';

function configWith(values: Record<string, unknown>) {
  return { get: (key: string) => values[key] };
}

function recordingLogger() {
  const lines: string[] = [];
  return { lines, info: (line: string) => lines.push(line) };
}

describe('bootstrap: database', function () {
  describe('databaseOptions', function () {
    it('is undefined when config names no client', function () {
      assert.equal(databaseOptions(configWith({}), { logger: recordingLogger() }), undefined);
      assert.equal(
        databaseOptions(configWith({ database: {} }), { logger: recordingLogger() }),
        undefined,
      );
    });

    it('passes MySQL config through, reading and never writing it', function () {
      const database = Object.freeze({
        client: 'mysql',
        connection: Object.freeze({ host: '127.0.0.1', database: 'ghost' }),
        pool: Object.freeze({ min: 0, max: 5 }),
      });
      const options = databaseOptions(configWith({ database }), {
        logger: recordingLogger(),
        env: {},
      });

      assert.deepEqual(options, {
        client: 'mysql2',
        connection: { host: '127.0.0.1', database: 'ghost' },
        knex: { pool: { min: 0, max: 5 } },
      });
    });

    it('lets a development process, or one explicitly allowed, stream local files into MySQL', function () {
      const config = configWith({ database: { client: 'mysql2', connection: {} } });
      const logger = recordingLogger();

      const dev = databaseOptions(config, {
        logger,
        env: { REQUIRE_INFILE_STREAM: '1', NODE_ENV: 'development' },
      });
      assert.equal(
        typeof (dev as { infileStreamFactory?: unknown }).infileStreamFactory,
        'function',
      );

      const allowed = databaseOptions(config, {
        logger,
        env: { REQUIRE_INFILE_STREAM: '1', ALLOW_INFILE_STREAM: '1' },
      });
      assert.equal(
        typeof (allowed as { infileStreamFactory?: unknown }).infileStreamFactory,
        'function',
      );

      assert.throws(
        () =>
          databaseOptions(config, {
            logger,
            env: { REQUIRE_INFILE_STREAM: '1', NODE_ENV: 'production' },
          }),
        /infile streaming is required/,
      );
    });

    it('maps the sqlite3 alias, and says so', function () {
      const logger = recordingLogger();
      const options = databaseOptions(
        configWith({
          env: 'production',
          database: { client: 'sqlite3', connection: { filename: '/var/ghost.db' } },
        }),
        { logger },
      );

      assert.deepEqual(options, {
        client: 'better-sqlite3',
        connection: { filename: '/var/ghost.db' },
        knex: {},
        durability: 'safe',
      });
      assert.deepEqual(logger.lines, [
        'Detected sqlite3 config, using better-sqlite3 as drop-in replacement',
      ]);
    });

    it('makes SQLite fast in testing, and moves /tmp to the Windows temp folder', function () {
      const config = configWith({
        env: 'testing',
        database: { client: 'better-sqlite3', connection: { filename: '/tmp/ghost-test.db' } },
      });

      const linux = databaseOptions(config, { logger: recordingLogger(), platform: 'linux' });
      assert.equal((linux as { durability?: string }).durability, 'fast');
      assert.equal(linux!.connection.filename, '/tmp/ghost-test.db');

      const windows = databaseOptions(config, { logger: recordingLogger(), platform: 'win32' });
      assert.equal(windows!.connection.filename, `${os.tmpdir()}/ghost-test.db`);
    });

    it('refuses a client Ghost does not support', function () {
      assert.throws(
        () =>
          databaseOptions(configWith({ database: { client: 'pg' } }), {
            logger: recordingLogger(),
          }),
        /Unsupported database client: pg/,
      );
    });
  });

  describe('buildDatabase', function () {
    it("builds a handle from Ghost's config through the framework", async function () {
      const database = buildDatabase(
        configWith({
          env: 'testing',
          database: { client: 'better-sqlite3', connection: { filename: ':memory:' } },
        }),
        { debug() {}, info() {}, warn() {}, error() {} },
      );

      assert.equal(database!.dialect, 'sqlite');
      const [row] = await database!.knex.raw('pragma foreign_keys');
      assert.equal(row.foreign_keys, 1);
      await database!.close();
    });

    it('builds nothing when config names no client', function () {
      assert.equal(
        buildDatabase(configWith({}), { debug() {}, info() {}, warn() {}, error() {} }),
        undefined,
      );
    });
  });

  describe('legacy seam', function () {
    it('hands require("core/server/data/db") the same handle the foundation holds', function () {
      const db = require('../../../core/server/data/db');
      const { legacyDatabase } = require('../../../bootstrap/transition/legacy-database');

      assert.equal(db.database, legacyDatabase());
      assert.equal(db.knex, legacyDatabase().knex);
    });
  });
});
