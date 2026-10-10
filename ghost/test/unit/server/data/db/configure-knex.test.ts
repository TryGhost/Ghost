import assert from 'node:assert/strict';
import { configure } from '../../../../../core/server/data/db/configure-knex';

// Frozen inputs, because that is what config hands out: configure() has to
// derive its result, and an in-place write would otherwise be silently dropped
// in this sloppy-mode-adjacent code rather than caught here.
function frozen<T>(value: T): T {
  Object.values(value as Record<string, unknown>).forEach((child) => {
    if (child && typeof child === 'object') {
      Object.freeze(child);
    }
  });

  return Object.freeze(value);
}

describe('configure (knex config)', function () {
  describe('mysql2', function () {
    const base = () =>
      frozen({
        client: 'mysql2',
        connection: { host: '127.0.0.1', user: 'root', database: 'ghost' },
      });

    it('derives the connection additions instead of writing into config', function () {
      const dbConfig = base();

      const knexConfig = configure(dbConfig) as { connection: Record<string, unknown> };

      assert.equal(knexConfig.connection.timezone, 'Z');
      assert.equal(knexConfig.connection.charset, 'utf8mb4');
      assert.equal(knexConfig.connection.decimalNumbers, true);

      // the leak this guards: nconf's merge shares nested subtrees by reference,
      // so writing into `connection` put knex's additions into config itself
      assert.deepEqual(dbConfig.connection, {
        host: '127.0.0.1',
        user: 'root',
        database: 'ghost',
      });
      assert.notEqual(knexConfig.connection, dbConfig.connection);
    });
  });

  describe('better-sqlite3', function () {
    it('derives pool and useNullAsDefault instead of writing into config', function () {
      const dbConfig = frozen({
        client: 'better-sqlite3',
        connection: { filename: '/tmp/ghost-test.db' },
      });

      const knexConfig = configure(dbConfig) as {
        pool: { afterCreate: unknown };
        useNullAsDefault: boolean;
      };

      assert.equal(typeof knexConfig.pool.afterCreate, 'function');
      assert.equal(knexConfig.useNullAsDefault, true);
      assert.ok(!Object.hasOwn(dbConfig, 'pool'));
      assert.ok(!Object.hasOwn(dbConfig, 'useNullAsDefault'));
    });

    it('honours an explicit useNullAsDefault', function () {
      const knexConfig = configure(
        frozen({
          client: 'better-sqlite3',
          connection: { filename: '/tmp/ghost-test.db' },
          useNullAsDefault: false,
        }),
      ) as { useNullAsDefault: boolean };

      assert.equal(knexConfig.useNullAsDefault, false);
    });

    it('maps the sqlite3 alias without writing into config', function () {
      const dbConfig = frozen({ client: 'sqlite3', connection: { filename: '/tmp/x.db' } });

      assert.equal((configure(dbConfig) as { client: string }).client, 'better-sqlite3');
      assert.equal(dbConfig.client, 'sqlite3');
    });
  });
});
