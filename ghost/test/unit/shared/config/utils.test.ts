import assert from 'node:assert/strict';
import path from 'node:path';
import * as configUtils from '../../../../core/shared/config/utils';

const packageRoot = path.resolve(__dirname, '../../../../');

describe('Config Utils', function () {
  describe('makePathAbsolute', function () {
    it('resolves a relative path against the package root', function () {
      assert.equal(
        configUtils.makePathAbsolute('content/data/ghost-dev.db'),
        path.join(packageRoot, 'content/data/ghost-dev.db'),
      );
      assert.equal(configUtils.makePathAbsolute('.'), packageRoot);
    });

    it("doesn't change an absolute path", function () {
      assert.equal(configUtils.makePathAbsolute('/tmp/ghost-test.db'), '/tmp/ghost-test.db');
    });
  });

  describe('makePathsAbsolute', function () {
    it('resolves relative paths against the package root, in a copy', function () {
      const paths = { contentPath: 'content/', appRoot: '.' };

      assert.deepEqual(configUtils.makePathsAbsolute(paths), {
        contentPath: path.join(packageRoot, 'content/'),
        appRoot: packageRoot,
      });
      assert.deepEqual(paths, { contentPath: 'content/', appRoot: '.' });
    });

    it('skips non strings and non paths', function () {
      const paths = { count: 10, name: 'ghost' };

      assert.deepEqual(configUtils.makePathsAbsolute(paths), { count: 10, name: 'ghost' });
    });

    it("doesn't change absolute paths", function () {
      assert.deepEqual(configUtils.makePathsAbsolute({ contentPath: '/content/' }), {
        contentPath: '/content/',
      });
    });

    it('matches paths on windows', function () {
      const { contentPath } = configUtils.makePathsAbsolute({ contentPath: 'content\\data' });

      assert.notEqual(contentPath, 'content\\data');
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
});
