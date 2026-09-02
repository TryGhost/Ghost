const assert = require('node:assert/strict');
const _ = require('lodash');
const configUtils = require('../../../../core/shared/config/utils');

let fakeConfig = {};
let fakeNconf = {};
let changedKey = [];

describe('Config Utils', function () {
  describe('makePathsAbsolute', function () {
    beforeEach(function () {
      changedKey = [];

      fakeNconf.get = (key) => {
        key = key.replace(':', '');
        return _.get(fakeConfig, key);
      };
      fakeNconf.set = function (key, value) {
        changedKey.push([key, value]);
      };
    });

    it('ensure we change paths only', function () {
      fakeConfig.database = {
        client: 'mysql',
        connection: {
          filename: 'content/data/ghost.db',
        },
      };

      configUtils.makePathsAbsolute(fakeNconf, fakeConfig.database, 'database');

      assert.equal(changedKey.length, 1);
      assert.equal(changedKey[0][0], 'database:connection:filename');
      assert.notEqual(changedKey[0][1], 'content/data/ghost.db');
    });

    it('ensure it skips non strings', function () {
      fakeConfig.database = {
        test: 10,
      };

      configUtils.makePathsAbsolute(fakeNconf, fakeConfig.database, 'database');
      assert.equal(changedKey.length, 0);
    });

    it("ensure we don't change absolute paths", function () {
      fakeConfig.database = {
        client: 'mysql',
        connection: {
          filename: '/content/data/ghost.db',
        },
      };

      configUtils.makePathsAbsolute(fakeNconf, fakeConfig.database, 'database');
      assert.equal(changedKey.length, 0);
    });

    it('match paths on windows', function () {
      fakeConfig.database = {
        filename: 'content\\data\\ghost.db',
      };

      configUtils.makePathsAbsolute(fakeNconf, fakeConfig.database, 'database');
      assert.equal(changedKey.length, 1);
      assert.equal(changedKey[0][0], 'database:filename');
      assert.notEqual(changedKey[0][1], 'content\\data\\ghost.db');
    });
  });

  describe('jsoncFormat', function () {
    it('parses JSONC, ignoring comments and trailing commas', function () {
      const parsed = configUtils.jsoncFormat.parse(
        '{\n  // a comment\n  "logging": {"level": "debug"},\n}',
      );

      assert.deepEqual(parsed, { logging: { level: 'debug' } });
    });

    it('throws on a truncated file rather than returning partial config', function () {
      assert.throws(
        () => configUtils.jsoncFormat.parse('{"database": {"connection": {"password": "hunter2"'),
        /CloseBraceExpected at 1:51/,
      );
    });

    it('reports every parse error, not just the first', function () {
      let message;

      try {
        configUtils.jsoncFormat.parse('{\n  "a": 1,,\n  "b" 2,\n  "c": [1 2]\n}');
      } catch (err) {
        message = err.message;
      }

      assert.equal(
        message,
        'PropertyNameExpected at 2:10, ValueExpected at 2:10, ColonExpected at 3:7, CommaExpected at 4:11',
      );
    });
  });

  describe('sanitizeDatabaseProperties', function () {
    let nconf;

    beforeEach(function () {
      nconf = {
        get: (key) => _.get(fakeConfig, key.replace(/:/g, '.')),
        set: (key, value) => _.set(fakeConfig, key.replace(/:/g, '.'), value),
      };
    });

    it('normalizes mysql client to mysql2', function () {
      fakeConfig = {
        database: {
          client: 'mysql',
          connection: { host: 'localhost', user: 'root', password: 'pw', database: 'ghost' },
        },
      };

      configUtils.sanitizeDatabaseProperties(nconf);

      assert.equal(nconf.get('database:client'), 'mysql2');
    });

    it('normalizes sqlite3 client to better-sqlite3', function () {
      fakeConfig = {
        database: {
          client: 'sqlite3',
          connection: { filename: 'content/data/ghost.db' },
        },
      };

      configUtils.sanitizeDatabaseProperties(nconf);

      assert.equal(nconf.get('database:client'), 'better-sqlite3');
    });

    it('leaves better-sqlite3 client unchanged', function () {
      fakeConfig = {
        database: {
          client: 'better-sqlite3',
          connection: { filename: 'content/data/ghost.db' },
        },
      };

      configUtils.sanitizeDatabaseProperties(nconf);

      assert.equal(nconf.get('database:client'), 'better-sqlite3');
    });
  });
});
