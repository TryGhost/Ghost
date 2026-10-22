const assert = require('node:assert/strict');
const { assertExists } = require('../../../../utils/assertions');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const db = require('../../../../../core/server/data/db');
const exporter = require('../../../../../core/server/data/exporter');
const schema = require('../../../../../core/server/data/schema');
const { Settings } = require('../../../../../core/server/models/settings');
const logging = require('@tryghost/logging');
const schemaTables = Object.keys(schema.tables);

describe('Exporter', function () {
  let tablesStub;
  let queryMock;
  let knexMock;

  afterEach(function () {
    sinon.restore();
  });

  describe('doExport', function () {
    beforeEach(function () {
      tablesStub = sinon.stub(schema.commands, 'getTables').returns(schemaTables);

      queryMock = {
        whereNot: sinon.stub(),
        select: sinon.stub(),
      };

      knexMock = sinon.stub().returns(queryMock);

      sinon.stub(db, 'knex').get(function () {
        return knexMock;
      });
    });

    it('should try to export all the correct tables (without excluded)', async function () {
      const exportData = await exporter.doExport();
      // NOTE: 15 default tables
      const expectedCallCount = exporter.TABLES_ALLOWLIST.length;

      assertExists(exportData);

      assert.match(exportData.meta.version, /\d+.\d+.\d+/gi);

      sinon.assert.calledOnce(tablesStub);
      sinon.assert.called(db.knex);

      sinon.assert.callCount(knexMock, expectedCallCount);
      sinon.assert.callCount(queryMock.select, expectedCallCount);

      const expectedTables = new Set([
        'posts',
        'posts_authors',
        'posts_meta',
        'posts_tags',
        'roles',
        'roles_users',
        'settings',
        'custom_theme_settings',
        'tags',
        'users',
        'products',
        'stripe_products',
        'stripe_prices',
        'posts_products',
        'newsletters',
        'benefits',
        'products_benefits',
        'offers',
        'offer_redemptions',
        'snippets',
      ]);
      const actualTables = new Set(knexMock.getCalls().map((call) => call.args[0]));
      assert.deepEqual(actualTables, expectedTables);
    });

    it('should try to export all the correct tables with extra tables', async function () {
      const include = ['mobiledoc_revisions', 'email_recipients'];

      const exportData = await exporter.doExport({ include });
      // NOTE: 15 default tables + 2 includes
      const expectedCallCount = exporter.TABLES_ALLOWLIST.length + 2;

      assertExists(exportData);

      assert.match(exportData.meta.version, /\d+.\d+.\d+/gi);

      sinon.assert.calledOnce(tablesStub);
      sinon.assert.called(db.knex);
      sinon.assert.called(queryMock.select);

      sinon.assert.callCount(knexMock, expectedCallCount);
      sinon.assert.callCount(queryMock.select, expectedCallCount);

      const expectedTables = new Set([
        'posts',
        'posts_authors',
        'posts_meta',
        'posts_tags',
        'roles',
        'roles_users',
        'settings',
        'custom_theme_settings',
        'tags',
        'users',
        'products',
        'stripe_products',
        'stripe_prices',
        'posts_products',
        'newsletters',
        'benefits',
        'products_benefits',
        'offers',
        'offer_redemptions',
        'snippets',
        ...include,
      ]);
      const actualTables = new Set(knexMock.getCalls().map((call) => call.args[0]));
      assert.deepEqual(actualTables, expectedTables);
    });

    it('should catch and log any errors', async function () {
      // Setup for failure
      queryMock.select.returns(Promise.reject({}));

      // Execute
      await assert.rejects(async () => {
        await exporter.doExport();
      }, errors.DataExportError);
    });
  });

  describe('streamExport', function () {
    let tableRows;
    let queries;
    let failingTable;

    // In-memory stand-in for knex that supports the calls both export paths make
    const createFakeKnex = function () {
      return function fakeKnex(tableName) {
        const query = { tableName, orderBy: null, limit: null, after: null };
        queries.push(query);

        const builder = {
          select() {
            return builder;
          },
          orderBy(column) {
            query.orderBy = column;
            return builder;
          },
          limit(limit) {
            query.limit = limit;
            return builder;
          },
          where(column, operator, value) {
            assert.equal(column, query.orderBy);
            assert.equal(operator, '>');
            query.after = value;
            return builder;
          },
          then(resolve, reject) {
            if (tableName === failingTable) {
              return Promise.reject(new Error('connection lost')).then(resolve, reject);
            }
            let rows = (tableRows[tableName] || []).slice();
            if (query.orderBy) {
              const column = query.orderBy;
              rows.sort((a, b) => (a[column] < b[column] ? -1 : 1));
              if (query.after !== null) {
                rows = rows.filter((row) => row[column] > query.after);
              }
            }
            if (query.limit) {
              rows = rows.slice(0, query.limit);
            }
            return Promise.resolve(rows).then(resolve, reject);
          },
        };

        return builder;
      };
    };

    const collect = async function (iterable) {
      const chunks = [];
      for await (const chunk of iterable) {
        chunks.push(chunk);
      }
      return chunks;
    };

    const makePost = (index, htmlLength = 10) => ({
      id: `post${String(index).padStart(4, '0')}`,
      title: `Post ${index}`,
      html: 'x'.repeat(htmlLength),
      published_at: new Date(Date.UTC(2026, 0, index + 1)),
      feature_image: null,
    });

    beforeEach(function () {
      queries = [];
      failingTable = null;
      tableRows = {
        posts: [makePost(1), makePost(2), makePost(3), makePost(4), makePost(5)],
        tags: [{ id: 'tag1', name: 'Tag "quoted" \u2028' }],
        users: [],
        settings: [
          { id: 'set1', group: 'core', key: 'db_hash', value: 'secret' },
          { id: 'set2', group: 'members', key: 'stripe_secret_key', value: 'sk_test' },
          { id: 'set3', group: 'site', key: 'title', value: 'My site' },
          { id: 'set4', group: 'site', key: 'description', value: null },
        ],
        members: [{ id: 'member1', email: 'member@example.com' }],
        mobiledoc_revisions: [{ id: 'rev1', post_id: 'post0001' }],
        automation_action_edges: [{ source_action_id: 'a1', target_action_id: 'a2' }],
      };

      sinon.stub(schema.commands, 'getTables').resolves(schemaTables);
      const fakeKnex = createFakeKnex();
      sinon.stub(db, 'knex').get(() => fakeKnex);
    });

    it('produces the same JSON as stringifying doExport', async function () {
      sinon.useFakeTimers({ now: 1700000000000, toFake: ['Date'] });

      const streamed = (await collect(exporter.streamExport({ batchSize: 2 }))).join('');
      const expected = JSON.stringify(await exporter.doExport());

      assert.equal(streamed, expected);
    });

    it('writes meta first, then each allowlisted table', async function () {
      const exportData = JSON.parse(
        (await collect(exporter.streamExport({ batchSize: 2 }))).join(''),
      );

      assert.deepEqual(Object.keys(exportData), ['meta', 'data']);
      assert.match(exportData.meta.version, /\d+.\d+.\d+/);
      assert.equal(typeof exportData.meta.exported_on, 'number');

      const allowlistedSchemaTables = schemaTables.filter((table) =>
        exporter.TABLES_ALLOWLIST.includes(table),
      );
      assert.deepEqual(Object.keys(exportData.data), allowlistedSchemaTables);

      assert.deepEqual(exportData.data.posts, JSON.parse(JSON.stringify(tableRows.posts)));
      assert.deepEqual(exportData.data.tags, tableRows.tags);
      assert.deepEqual(exportData.data.users, []);
      assert.equal(exportData.data.members, undefined);
      assert.equal(exportData.data.mobiledoc_revisions, undefined);
    });

    it('filters core and blocklisted settings', async function () {
      const exportData = JSON.parse(
        (await collect(exporter.streamExport({ batchSize: 1 }))).join(''),
      );

      assert.deepEqual(
        exportData.data.settings.map((setting) => setting.key),
        ['title', 'description'],
      );
    });

    it('exports included tables', async function () {
      const include = ['members', 'automation_action_edges'];
      const exportData = JSON.parse((await collect(exporter.streamExport({ include }))).join(''));

      assert.deepEqual(exportData.data.members, tableRows.members);
      assert.deepEqual(exportData.data.automation_action_edges, tableRows.automation_action_edges);
      assert.equal(exportData.data.mobiledoc_revisions, undefined);
    });

    it('reads and yields rows in batches using keyset pagination', async function () {
      const chunks = await collect(exporter.streamExport({ batchSize: 2 }));

      const postQueries = queries.filter((query) => query.tableName === 'posts');
      assert.deepEqual(
        postQueries.map((query) => [query.orderBy, query.limit, query.after]),
        [
          ['id', 2, null],
          ['id', 2, 'post0002'],
          ['id', 2, 'post0004'],
        ],
      );

      const postsStart = chunks.findIndex((chunk) => chunk.endsWith('"posts":['));
      assert.notEqual(postsStart, -1);
      const postChunks = chunks.slice(postsStart + 1, chunks.indexOf(']', postsStart));
      assert.equal(postChunks.length, 3);
      assert.equal(JSON.parse(`[${postChunks.join('')}]`).length, 5);
    });

    it('reads tables without a single-column primary key in one query', async function () {
      await collect(exporter.streamExport({ include: ['automation_action_edges'], batchSize: 1 }));

      const edgeQueries = queries.filter((query) => query.tableName === 'automation_action_edges');
      assert.deepEqual(
        edgeQueries.map((query) => [query.orderBy, query.limit]),
        [[null, null]],
      );
    });

    it('can write an export larger than the maximum string length', async function () {
      // Simulate V8's string length limit at a size small enough for CI: any single
      // JSON.stringify result over the limit throws, like it does in production at ~512MB
      const maxStringLength = 5000;
      const originalStringify = JSON.stringify;
      const stringifyStub = sinon.stub(JSON, 'stringify').callsFake(function (...args) {
        const result = originalStringify.apply(JSON, args);
        if (result && result.length > maxStringLength) {
          throw new RangeError('Invalid string length');
        }
        return result;
      });

      tableRows.posts = Array.from({ length: 50 }, (_, index) => makePost(index, 500));

      const exportData = await exporter.doExport();
      assert.throws(() => JSON.stringify(exportData), RangeError);

      stringifyStub.resetHistory();
      const chunks = await collect(exporter.streamExport({ batchSize: 2 }));

      for (const call of stringifyStub.getCalls()) {
        assert.equal(Array.isArray(call.args[0]), false);
        assert.equal(Object.hasOwn(call.args[0] ?? {}, 'data'), false);
      }
      for (const chunk of chunks) {
        assert(chunk.length <= maxStringLength, `chunk of ${chunk.length} chars is too large`);
      }

      const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
      assert(totalLength > maxStringLength * 5);
      assert.equal(JSON.parse(chunks.join('')).data.posts.length, 50);
    });

    it('wraps errors in a DataExportError', async function () {
      failingTable = 'tags';

      await assert.rejects(collect(exporter.streamExport()), errors.DataExportError);
    });
  });

  describe('exportFileName', function () {
    it('should return a correctly structured filename', async function () {
      const settingsStub = sinon.stub(Settings, 'findOne').returns(
        Promise.resolve({
          get: function () {
            return 'testblog';
          },
        }),
      );

      const result = await exporter.fileName();
      assertExists(result);
      sinon.assert.calledOnce(settingsStub);
      assert.match(
        result,
        /^testblog\.ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}\.json$/,
      );
    });

    it('should return a correctly structured filename if settings is empty', async function () {
      const settingsStub = sinon.stub(Settings, 'findOne').returns(Promise.resolve());

      const result = await exporter.fileName();
      assertExists(result);
      sinon.assert.calledOnce(settingsStub);
      assert.match(result, /^ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}\.json$/);
    });

    it('should return a correctly structured filename if settings errors', async function () {
      const settingsStub = sinon.stub(Settings, 'findOne').returns(Promise.reject());
      const loggingStub = sinon.stub(logging, 'error');

      const result = await exporter.fileName();
      assertExists(result);
      sinon.assert.calledOnce(settingsStub);
      sinon.assert.calledOnce(loggingStub);
      assert.match(result, /^ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}\.json$/);
    });

    it('should return the base filename if path separator is present', async function () {
      const filename = '../../backup';
      const result = await exporter.fileName({ filename });
      assertExists(result);
      assert.equal(result, 'backup.json');
    });
  });

  describe('Export table allowlists', function () {
    it('should be fixed when db schema introduces new tables', function () {
      const {
        BACKUP_TABLES,
        TABLES_ALLOWLIST,
      } = require('../../../../../core/server/data/exporter/table-lists.js');

      const nonSchemaTables = ['migrations', 'migrations_lock'];
      const requiredTables = schemaTables.concat(nonSchemaTables);
      // NOTE: You should not add tables to this list unless they are temporary
      const ignoredTables = ['temp_member_analytic_events'];

      const expectedTables = requiredTables
        .filter((table) => !ignoredTables.includes(table))
        .sort();
      const actualTables = BACKUP_TABLES.concat(TABLES_ALLOWLIST).sort();

      // NOTE: this test is serving a role of a reminder to have a look into exported tables allowlists
      //       if it failed you probably need to add or remove a table entry from table-lists module
      assert.deepEqual(actualTables, expectedTables);
    });

    it('should be fixed when default settings is changed', function () {
      const {
        SETTING_KEYS_BLOCKLIST,
      } = require('../../../../../core/server/data/exporter/table-lists.js');
      const defaultSettings = require('../../../../../core/server/data/schema/default-settings/default-settings.json');

      // core settings are always excluded from exports
      const nonCoreKeysLength = Object.keys(defaultSettings)
        .filter((group) => group !== 'core')
        .reduce((acc, curr) => {
          return acc + Object.keys(defaultSettings[curr]).length;
        }, 0);

      // NOTE: if default settings changed either modify the settings keys blocklist or increase allowedKeysLength
      //       This is a reminder to think about the importer/exporter scenarios ;)
      const allowedKeysLength = 99;
      assert.equal(nonCoreKeysLength, SETTING_KEYS_BLOCKLIST.length + allowedKeysLength);
    });
  });
});
