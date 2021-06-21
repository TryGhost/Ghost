const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
const Promise = require('bluebird');
const errors = require('@tryghost/errors');
const db = require('../../../../core/server/data/db');
const exporter = rewire('../../../../core/server/data/exporter');
const schema = require('../../../../core/server/data/schema');
const models = require('../../../../core/server/models');
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
                // NOTE: 9 default tables
                const expectedCallCount = 9;

                should.exist(exportData);

                exportData.meta.version.should.match(/\d+.\d+.\d+/gi);

                tablesStub.calledOnce.should.be.true();
                db.knex.called.should.be.true();

                knexMock.callCount.should.eql(expectedCallCount);
                queryMock.select.callCount.should.have.eql(expectedCallCount);

                knexMock.getCall(0).args[0].should.eql('posts');
                knexMock.getCall(1).args[0].should.eql('posts_meta');
                knexMock.getCall(2).args[0].should.eql('users');
                knexMock.getCall(3).args[0].should.eql('posts_authors');
                knexMock.getCall(4).args[0].should.eql('roles');
                knexMock.getCall(5).args[0].should.eql('roles_users');
                knexMock.getCall(6).args[0].should.eql('settings');
                knexMock.getCall(7).args[0].should.eql('tags');
                knexMock.getCall(8).args[0].should.eql('posts_tags');

                done();
            }).catch(done);
        });

        it('should try to export all the correct tables with extra tables', function (done) {
            const include = ['mobiledoc_revisions', 'email_recipients'];

            exporter.doExport({include}).then(function (exportData) {
                // NOTE: 9 default tables + 2 includes
                const expectedCallCount = 11;

                should.exist(exportData);

                exportData.meta.version.should.match(/\d+.\d+.\d+/gi);

                tablesStub.calledOnce.should.be.true();
                db.knex.called.should.be.true();
                queryMock.select.called.should.be.true();

                knexMock.callCount.should.eql(expectedCallCount);
                queryMock.select.callCount.should.have.eql(expectedCallCount);

                knexMock.getCall(0).args[0].should.eql('posts');
                knexMock.getCall(1).args[0].should.eql('posts_meta');
                knexMock.getCall(2).args[0].should.eql('users');
                knexMock.getCall(3).args[0].should.eql('posts_authors');
                knexMock.getCall(4).args[0].should.eql('roles');
                knexMock.getCall(5).args[0].should.eql('roles_users');
                knexMock.getCall(6).args[0].should.eql('settings');
                knexMock.getCall(7).args[0].should.eql('tags');
                knexMock.getCall(8).args[0].should.eql('posts_tags');
                knexMock.getCall(9).args[0].should.eql('mobiledoc_revisions');
                knexMock.getCall(10).args[0].should.eql('email_recipients');

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
                    (err instanceof errors.DataExportError).should.eql(true);
                    done();
                });
        });
    });

    describe('exportFileName', function () {
        it('should return a correctly structured filename', function (done) {
            const settingsStub = sinon.stub(models.Settings, 'findOne').returns(
                new Promise.resolve({
                    get: function () {
                        return 'testblog';
                    }
                })
            );

            exporter.fileName().then(function (result) {
                should.exist(result);
                settingsStub.calledOnce.should.be.true();
                result.should.match(/^testblog\.ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}\.json$/);

                done();
            }).catch(done);
        });

        it('should return a correctly structured filename if settings is empty', function (done) {
            const settingsStub = sinon.stub(models.Settings, 'findOne').returns(
                new Promise.resolve()
            );

            exporter.fileName().then(function (result) {
                should.exist(result);
                settingsStub.calledOnce.should.be.true();
                result.should.match(/^ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}\.json$/);

                done();
            }).catch(done);
        });

        it('should return a correctly structured filename if settings errors', function (done) {
            const settingsStub = sinon.stub(models.Settings, 'findOne').returns(
                new Promise.reject()
            );

            exporter.fileName().then(function (result) {
                should.exist(result);
                settingsStub.calledOnce.should.be.true();
                result.should.match(/^ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}\.json$/);

                done();
            }).catch(done);
        });
    });

    describe('Export table whitelists', function () {
        it('should be fixed when db schema introduces new tables', function () {
            const {
                BACKUP_TABLES,
                TABLES_ALLOWLIST
            } = require('../../../../core/server/data/exporter/table-lists.js');

            const nonSchemaTables = ['migrations', 'migrations_lock'];

            // NOTE: this test is serving a role of a reminder to have a look into exported tables allowlists
            //       if it failed you probably need to add or remove a table entry from table-lists module
            [...Object.keys(schema.tables), ...nonSchemaTables].sort().should.eql([...BACKUP_TABLES, ...TABLES_ALLOWLIST].sort());
        });

        it('should be fixed when default settings is changed', function () {
            const {
                SETTING_KEYS_BLOCKLIST
            } = require('../../../../core/server/data/exporter/table-lists.js');
            const defaultSettings = require('../../../../core/server/data/schema/default-settings.json');

            const totalKeysLength = Object.keys(defaultSettings).reduce((acc, curr, index) => {
                return acc + Object.keys(defaultSettings[curr]).length;
            }, 0);

            // NOTE: if default settings changed either modify the settings keys blocklist or increase allowedKeysLength
            //       This is a reminder to think about the importer/exporter scenarios ;)
            const allowedKeysLength = 83;
            totalKeysLength.should.eql(SETTING_KEYS_BLOCKLIST.length + allowedKeysLength);
        });
    });
});
