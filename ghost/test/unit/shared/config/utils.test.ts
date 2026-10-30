import assert from 'node:assert/strict';
import path from 'node:path';
import * as configUtils from '../../../../core/shared/config/utils';

const packageRoot = path.resolve(__dirname, '../../../../');

describe('Config Utils', function () {
  describe('makePathsAbsolute', function () {
    it('resolves relative paths against the package root', function () {
      const paths = { contentPath: 'content/', nested: { appRoot: '.' } };

      configUtils.makePathsAbsolute(paths);

      assert.deepEqual(paths, {
        contentPath: path.join(packageRoot, 'content/'),
        nested: { appRoot: packageRoot },
      });
    });

    it('skips non strings and non paths', function () {
      const paths = { count: 10, name: 'ghost' };

      configUtils.makePathsAbsolute(paths);

      assert.deepEqual(paths, { count: 10, name: 'ghost' });
    });

    it("doesn't change absolute paths", function () {
      const paths = { contentPath: '/content/' };

      configUtils.makePathsAbsolute(paths);

      assert.deepEqual(paths, { contentPath: '/content/' });
    });

    it('matches paths on windows', function () {
      const paths = { contentPath: 'content\\data' };

      configUtils.makePathsAbsolute(paths);

      assert.notEqual(paths.contentPath, 'content\\data');
    });

    it('ignores a missing paths object', function () {
      assert.doesNotThrow(() => configUtils.makePathsAbsolute(undefined));
    });
  });

  describe('makeBundledDatabasePathsAbsolute', function () {
    it('resolves a relative sqlite filename against the package root', function () {
      const store = { database: { connection: { filename: 'content/data/ghost-dev.db' } } };

      configUtils.makeBundledDatabasePathsAbsolute(store);

      assert.equal(
        store.database.connection.filename,
        path.join(packageRoot, 'content/data/ghost-dev.db'),
      );
    });

    it('ignores a store without database config', function () {
      assert.doesNotThrow(() => configUtils.makeBundledDatabasePathsAbsolute({ url: 'http://x' }));
      assert.doesNotThrow(() => configUtils.makeBundledDatabasePathsAbsolute(undefined));
    });
  });

  describe('sanitizeDatabaseProperties', function () {
    it('normalizes mysql client to mysql2 and drops the sqlite filename', function () {
      const database = {
        client: 'mysql',
        connection: {
          host: 'localhost',
          user: 'root',
          password: 'pw',
          database: 'ghost',
          filename: 'x/ghost.db',
        },
      };

      configUtils.sanitizeDatabaseProperties(database);

      assert.deepEqual(database, {
        client: 'mysql2',
        connection: { host: 'localhost', user: 'root', password: 'pw', database: 'ghost' },
      });
    });

    it('normalizes sqlite3 client to better-sqlite3 and drops the mysql keys', function () {
      const database = {
        client: 'sqlite3',
        connection: {
          host: 'localhost',
          user: 'root',
          password: 'pw',
          database: 'ghost',
          filename: 'content/data/ghost.db',
        },
      };

      configUtils.sanitizeDatabaseProperties(database);

      assert.deepEqual(database, {
        client: 'better-sqlite3',
        connection: { filename: 'content/data/ghost.db' },
      });
    });

    it('leaves better-sqlite3 client unchanged', function () {
      const database = {
        client: 'better-sqlite3',
        connection: { filename: 'content/data/ghost.db' },
      };

      configUtils.sanitizeDatabaseProperties(database);

      assert.equal(database.client, 'better-sqlite3');
    });

    it('ignores a missing database object', function () {
      assert.doesNotThrow(() => configUtils.sanitizeDatabaseProperties(undefined));
    });
  });
});
