var should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    Promise = require('bluebird'),
    db = require('../../../../core/server/data/db'),
    common = require('../../../../core/server/lib/common'),
    exporter = rewire('../../../../core/server/data/exporter'),
    schema = require('../../../../core/server/data/schema'),
    models = require('../../../../core/server/models'),
    schemaTables = Object.keys(schema.tables);

describe('Exporter', function () {
    var tablesStub, queryMock, knexMock;

    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('doExport', function () {
        beforeEach(function () {
            exporter.__set__('ghostVersion', {
                full: '2.0.0'
            });

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
            // Setup for success
            queryMock.select.returns(new Promise.resolve({}));

            // Execute
            exporter.doExport().then(function (exportData) {
                // No tables, less the number of excluded tables
                var expectedCallCount = schemaTables.length - exporter.EXCLUDED_TABLES.length;

                should.exist(exportData);

                //TODO: Update when 3.0.0 is released
                exportData.meta.version.should.eql('2.0.0');

                tablesStub.calledOnce.should.be.true();
                db.knex.called.should.be.true();
                queryMock.select.called.should.be.true();
                queryMock.whereNot.calledOnce.should.be.true();

                knexMock.callCount.should.eql(expectedCallCount);
                queryMock.select.callCount.should.have.eql(expectedCallCount);

                knexMock.getCall(0).args[0].should.eql('posts');
                knexMock.getCall(1).args[0].should.eql('posts_meta');
                knexMock.getCall(2).args[0].should.eql('users');
                knexMock.getCall(3).args[0].should.eql('posts_authors');
                knexMock.getCall(4).args[0].should.eql('roles');
                knexMock.getCall(5).args[0].should.eql('roles_users');
                knexMock.getCall(6).args[0].should.eql('permissions');
                knexMock.getCall(7).args[0].should.eql('permissions_users');
                knexMock.getCall(8).args[0].should.eql('permissions_roles');
                knexMock.getCall(9).args[0].should.eql('permissions_apps');
                knexMock.getCall(10).args[0].should.eql('settings');
                knexMock.getCall(11).args[0].should.eql('tags');
                knexMock.getCall(12).args[0].should.eql('posts_tags');
                knexMock.getCall(13).args[0].should.eql('apps');
                knexMock.getCall(14).args[0].should.eql('app_settings');
                knexMock.getCall(15).args[0].should.eql('app_fields');

                done();
            }).catch(done);
        });

        // SKIPPED: the "extra" clients and client_trusted_domains tables no longer exist
        it.skip('should try to export all the correct tables with extra tables', function (done) {
            // Setup for success
            queryMock.select.returns(new Promise.resolve({}));

            // Execute
            exporter.doExport({include: ['clients', 'client_trusted_domains']}).then(function (exportData) {
                // all tables, except of the tokes and sessions
                const expectedCallCount = schemaTables.length - (exporter.EXCLUDED_TABLES.length - 2);

                should.exist(exportData);

                exportData.meta.version.should.eql('2.0.0');

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
                knexMock.getCall(6).args[0].should.eql('permissions');
                knexMock.getCall(7).args[0].should.eql('permissions_users');
                knexMock.getCall(8).args[0].should.eql('permissions_roles');
                knexMock.getCall(9).args[0].should.eql('permissions_apps');
                knexMock.getCall(10).args[0].should.eql('settings');
                knexMock.getCall(11).args[0].should.eql('tags');
                knexMock.getCall(12).args[0].should.eql('posts_tags');
                knexMock.getCall(13).args[0].should.eql('apps');
                knexMock.getCall(14).args[0].should.eql('app_settings');
                knexMock.getCall(15).args[0].should.eql('app_fields');
                knexMock.getCall(16).args[0].should.eql('clients');
                knexMock.getCall(17).args[0].should.eql('client_trusted_domains');

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
                    (err instanceof common.errors.DataExportError).should.eql(true);
                    done();
                });
        });
    });

    describe('exportFileName', function () {
        it('should return a correctly structured filename', function (done) {
            var settingsStub = sinon.stub(models.Settings, 'findOne').returns(
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
            var settingsStub = sinon.stub(models.Settings, 'findOne').returns(
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
            var settingsStub = sinon.stub(models.Settings, 'findOne').returns(
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
});
