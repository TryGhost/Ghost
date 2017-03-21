var should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    Promise = require('bluebird'),
    db = require('../../server/data/db'),
    errors = require('../../server/errors'),
    exporter = rewire('../../server/data/export'),
    schema = require('../../server/data/schema'),
    models = require('../../server/models'),
    schemaTables = Object.keys(schema.tables),

    sandbox = sinon.sandbox.create();

describe('Exporter', function () {
    var tablesStub, queryMock, knexMock, knexStub;

    before(function () {
        models.init();
    });

    afterEach(function () {
        sandbox.restore();
        knexStub.restore();
    });

    describe('doExport', function () {
        beforeEach(function () {
            exporter.__set__('ghostVersion', {
                full: '1.0.0'
            });

            tablesStub = sandbox.stub(schema.commands, 'getTables').returns(schemaTables);

            queryMock = {
                select: sandbox.stub()
            };

            knexMock = sandbox.stub().returns(queryMock);

            // this MUST use sinon, not sandbox, see sinonjs/sinon#781
            knexStub = sinon.stub(db, 'knex', {
                get: function () {
                    return knexMock;
                }
            });
        });

        it('should try to export all the correct tables', function (done) {
            // Setup for success
            queryMock.select.returns(new Promise.resolve({}));

            // Execute
            exporter.doExport().then(function (exportData) {
                // No tables, less the number of excluded tables
                var expectedCallCount = schemaTables.length - 4;

                should.exist(exportData);

                exportData.meta.version.should.eql('1.0.0');

                tablesStub.calledOnce.should.be.true();
                knexStub.get.called.should.be.true();
                knexMock.called.should.be.true();
                queryMock.select.called.should.be.true();

                knexMock.callCount.should.eql(expectedCallCount);
                queryMock.select.callCount.should.have.eql(expectedCallCount);

                knexMock.getCall(0).args[0].should.eql('posts');
                knexMock.getCall(1).args[0].should.eql('users');
                knexMock.getCall(2).args[0].should.eql('roles');
                knexMock.getCall(3).args[0].should.eql('roles_users');
                knexMock.getCall(4).args[0].should.eql('permissions');
                knexMock.getCall(5).args[0].should.eql('permissions_users');
                knexMock.getCall(6).args[0].should.eql('permissions_roles');
                knexMock.getCall(7).args[0].should.eql('permissions_apps');
                knexMock.getCall(8).args[0].should.eql('settings');
                knexMock.getCall(9).args[0].should.eql('tags');
                knexMock.getCall(10).args[0].should.eql('posts_tags');
                knexMock.getCall(11).args[0].should.eql('apps');
                knexMock.getCall(12).args[0].should.eql('app_settings');
                knexMock.getCall(13).args[0].should.eql('app_fields');

                knexMock.calledWith('clients').should.be.false();
                knexMock.calledWith('client_trusted_domains').should.be.false();
                knexMock.calledWith('refreshtokens').should.be.false();
                knexMock.calledWith('accesstokens').should.be.false();

                done();
            }).catch(done);
        });

        it('should catch and log any errors', function (done) {
            // Setup for failure
            queryMock.select.returns(new Promise.reject({}));

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
            var settingsStub = sandbox.stub(models.Settings, 'findOne').returns(
                new Promise.resolve({
                    get: function () {
                        return 'testblog';
                    }
                })
            );

            exporter.fileName().then(function (result) {
                should.exist(result);
                settingsStub.calledOnce.should.be.true();
                result.should.match(/^testblog\.ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}\.json$/);

                done();
            }).catch(done);
        });

        it('should return a correctly structured filename if settings is empty', function (done) {
            var settingsStub = sandbox.stub(models.Settings, 'findOne').returns(
                new Promise.resolve()
            );

            exporter.fileName().then(function (result) {
                should.exist(result);
                settingsStub.calledOnce.should.be.true();
                result.should.match(/^ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}\.json$/);

                done();
            }).catch(done);
        });

        it('should return a correctly structured filename if settings errors', function (done) {
            var settingsStub = sandbox.stub(models.Settings, 'findOne').returns(
                new Promise.reject()
            );

            exporter.fileName().then(function (result) {
                should.exist(result);
                settingsStub.calledOnce.should.be.true();
                result.should.match(/^ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}\.json$/);

                done();
            }).catch(done);
        });
    });
});
