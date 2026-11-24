import assert from 'node:assert/strict';
import { createDatabase, knexConfig } from '#foundry/database';

describe('foundry: database', function () {
  describe('knexConfig', function () {
    it('sets what every MySQL connection needs over what it is given', function () {
      const connection = Object.freeze({ host: '127.0.0.1', timezone: 'local' });
      const config = knexConfig({
        client: 'mysql2',
        connection,
        knex: { pool: { min: 0, max: 5 } },
      });

      assert.equal(config.client, 'mysql2');
      assert.deepEqual(config.pool, { min: 0, max: 5 });
      assert.deepEqual(config.connection, {
        host: '127.0.0.1',
        timezone: 'Z',
        charset: 'utf8mb4',
        decimalNumbers: true,
      });
    });

    it('passes an infile stream factory to MySQL only when given one', function () {
      const factory = () => process.stdin;
      const withFactory = knexConfig({
        client: 'mysql2',
        connection: {},
        infileStreamFactory: factory,
      });

      assert.equal(
        (withFactory.connection as Record<string, unknown>).infileStreamFactory,
        factory,
      );
      assert.ok(
        !(
          'infileStreamFactory' in
          (knexConfig({ client: 'mysql2', connection: {} }).connection as object)
        ),
      );
    });

    it('gives SQLite its pragmas, replacing any pool it is given', function () {
      const pragmas = (durability?: 'safe' | 'fast') => {
        const config = knexConfig({
          client: 'better-sqlite3',
          connection: { filename: ':memory:' },
          durability,
          knex: { pool: { min: 3 } },
        });
        const run: string[] = [];
        (config.pool as { afterCreate: Function }).afterCreate(
          { pragma: (p: string) => run.push(p) },
          () => {},
        );
        assert.equal(config.useNullAsDefault, true);
        assert.equal((config.pool as { min?: number }).min, undefined);
        return run;
      };

      assert.deepEqual(pragmas(), ['foreign_keys = ON']);
      assert.deepEqual(pragmas('fast'), [
        'foreign_keys = ON',
        'synchronous = OFF',
        'journal_mode = TRUNCATE',
      ]);
    });

    it('honours an explicit useNullAsDefault', function () {
      const config = knexConfig({
        client: 'better-sqlite3',
        connection: { filename: ':memory:' },
        knex: { useNullAsDefault: false },
      });
      assert.equal(config.useNullAsDefault, false);
    });
  });

  describe('createDatabase', function () {
    it('builds a handle that connects on first query and is closed by its owner', async function () {
      const database = createDatabase({
        client: 'better-sqlite3',
        connection: { filename: ':memory:' },
      });

      assert.equal(database.dialect, 'sqlite');
      assert.ok(Object.isFrozen(database));

      const [row] = await database.knex.raw('select 1 + 1 as two');
      assert.equal(row.two, 2);

      await database.close();
      await assert.rejects(database.knex.raw('select 1'));
    });

    it('asks the server what it is once, and keeps the answer', async function () {
      const database = createDatabase({
        client: 'better-sqlite3',
        connection: { filename: ':memory:' },
      });

      const first = database.server();
      assert.equal(database.server(), first);

      const server = await first;
      assert.equal(server.database, 'SQLite');
      assert.equal(server.engine, 'sqlite3');
      assert.equal(server.driver, 'better-sqlite3');
      await database.close();
    });

    it('does not keep an answer worked out while the server could not be reached', async function () {
      // Port 9 (discard) refuses at once on most machines; the answer is unknown either way
      const database = createDatabase({
        client: 'mysql2',
        connection: { host: '127.0.0.1', port: 9, user: 'none', connectTimeout: 500 },
        knex: { acquireConnectionTimeout: 1000 },
      });

      const first = database.server();
      assert.equal((await first).engine, 'unknown');
      assert.notEqual(database.server(), first);
      await database.server();
      await database.close();
    });
  });
});
