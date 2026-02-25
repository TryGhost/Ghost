const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const db = require('../../../../../core/server/data/db');
const exporter = require('../../../../../core/server/data/exporter');
const schema = require('../../../../../core/server/data/schema');
const models = require('../../../../../core/server/models');
const logging = require('@tryghost/logging');
const schemaTables = Object.keys(schema.tables);

describe('Exporter', function () {
    let tablesStub;
    let queryMock;
    let knexMock;

    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('doExport', function () {
        beforeEach(function () {
            tablesStub = sinon.stub(schema.commands, 'getTables').returns(schemaTables);

            queryMock = {
                whereNot: sinon.stub(),
                select: sinon.stub()
            };

            knexMock = sinon.stub().returns(queryMock);

            sinon.stub(db, 'knex').get(function () {
                return knexMock;
            });
        });

        it('should try to export all the correct tables (without excluded)', function (done) {
            exporter.doExport().then(function (exportData) {
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
                    'snippets'
                ]);
                const actualTables = new Set(knexMock.getCalls().map(call => call.args[0]));
                assert.deepEqual(actualTables, expectedTables);

                done();
            }).catch(done);
        });

        it('should try to export all the correct tables with extra tables', function (done) {
            const include = ['mobiledoc_revisions', 'email_recipients'];

            exporter.doExport({include}).then(function (exportData) {
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
                    ...include
                ]);
                const actualTables = new Set(knexMock.getCalls().map(call => call.args[0]));
                assert.deepEqual(actualTables, expectedTables);

                done();
            }).catch(done);
        });

        it('should catch and log any errors', function (done) {
            // Setup for failure
            queryMock.select.returns(Promise.reject({}));

            // Execute
            exporter.doExport()
                .then(function () {
                    done(new Error('expected error for export'));
                })
                .catch(function (err) {
                    assert.equal((err instanceof errors.DataExportError), true);
                    done();
                });
        });
    });

    describe('exportFileName', function () {
        it('should return a correctly structured filename', function (done) {
            const settingsStub = sinon.stub(models.Settings, 'findOne').returns(
                Promise.resolve({
                    get: function () {
                        return 'testblog';
                    }
                })
            );

            exporter.fileName().then(function (result) {
                assertExists(result);
                sinon.assert.calledOnce(settingsStub);
                assert.match(result, /^testblog\.ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}\.json$/);

                done();
            }).catch(done);
        });

        it('should return a correctly structured filename if settings is empty', function (done) {
            const settingsStub = sinon.stub(models.Settings, 'findOne').returns(
                Promise.resolve()
            );

            exporter.fileName().then(function (result) {
                assertExists(result);
                sinon.assert.calledOnce(settingsStub);
                assert.match(result, /^ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}\.json$/);

                done();
            }).catch(done);
        });

        it('should return a correctly structured filename if settings errors', function (done) {
            const settingsStub = sinon.stub(models.Settings, 'findOne').returns(
                Promise.reject()
            );
            const loggingStub = sinon.stub(logging, 'error');

            exporter.fileName().then(function (result) {
                assertExists(result);
                sinon.assert.calledOnce(settingsStub);
                sinon.assert.calledOnce(loggingStub);
                assert.match(result, /^ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}\.json$/);

                done();
            }).catch(done);
        });
    });

    describe('Export table allowlists', function () {
        it('should be fixed when db schema introduces new tables', function () {
            const {
                BACKUP_TABLES,
                TABLES_ALLOWLIST
            } = require('../../../../../core/server/data/exporter/table-lists.js');

            const nonSchemaTables = ['migrations', 'migrations_lock'];
            const requiredTables = schemaTables.concat(nonSchemaTables);
            // NOTE: You should not add tables to this list unless they are temporary
            const ignoredTables = ['temp_member_analytic_events'];

            const expectedTables = requiredTables.filter(table => !ignoredTables.includes(table)).sort();
            const actualTables = BACKUP_TABLES.concat(TABLES_ALLOWLIST).sort();

            // NOTE: this test is serving a role of a reminder to have a look into exported tables allowlists
            //       if it failed you probably need to add or remove a table entry from table-lists module
            assert.deepEqual(actualTables, expectedTables);
        });

        it('should be fixed when default settings is changed', function () {
            const {
                SETTING_KEYS_BLOCKLIST
            } = require('../../../../../core/server/data/exporter/table-lists.js');
            const defaultSettings = require('../../../../../core/server/data/schema/default-settings/default-settings.json');

            const totalKeysLength = Object.keys(defaultSettings).reduce((acc, curr) => {
                return acc + Object.keys(defaultSettings[curr]).length;
            }, 0);

            // NOTE: if default settings changed either modify the settings keys blocklist or increase allowedKeysLength
            //       This is a reminder to think about the importer/exporter scenarios ;)
            const allowedKeysLength = 100;
            assert.equal(totalKeysLength, SETTING_KEYS_BLOCKLIST.length + allowedKeysLength);
        });
    });
});
