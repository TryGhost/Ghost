/*globals describe, afterEach, beforeEach, it*/
var should    = require('should'),
    sinon     = require('sinon'),
    Promise   = require('bluebird'),

    // Stuff we're testing
    db        = require('../../server/data/db'),
    errors    = require('../../server/errors'),
    exporter  = require('../../server/data/export'),
    schema    = require('../../server/data/schema'),
    settings  = require('../../server/api/settings'),

    schemaTables = Object.keys(schema.tables),

    sandbox = sinon.sandbox.create();

require('should-sinon');

describe('Exporter', function () {
    var versionStub, tablesStub, queryMock, knexMock, knexStub;

    afterEach(function () {
        sandbox.restore();
        knexStub.restore();
    });

    describe('doExport', function () {
        beforeEach(function () {
            versionStub = sandbox.stub(schema.versioning, 'getDatabaseVersion').returns(new Promise.resolve('004'));
            tablesStub = sandbox.stub(schema.commands, 'getTables').returns(schemaTables);

            queryMock = {
                select: sandbox.stub()
            };

            knexMock = sandbox.stub().returns(queryMock);

            // this MUST use sinon, not sandbox, see sinonjs/sinon#781
            knexStub = sinon.stub(db, 'knex', {get: function () { return knexMock; }});
        });

        it('should try to export all the correct tables', function (done) {
            // Setup for success
            queryMock.select.returns(new Promise.resolve({}));

            // Execute
            exporter.doExport().then(function (exportData) {
                // No tables, less the number of excluded tables
                var expectedCallCount = schemaTables.length - 4;

                should.exist(exportData);

                versionStub.should.be.calledOnce();
                tablesStub.should.be.calledOnce();
                knexStub.get.should.be.called();
                knexMock.should.be.called();
                queryMock.select.should.be.called();

                knexMock.should.have.callCount(expectedCallCount);
                queryMock.select.should.have.callCount(expectedCallCount);

                knexMock.getCall(0).should.be.calledWith('posts');
                knexMock.getCall(1).should.be.calledWith('users');
                knexMock.getCall(2).should.be.calledWith('roles');
                knexMock.getCall(3).should.be.calledWith('roles_users');
                knexMock.getCall(4).should.be.calledWith('permissions');
                knexMock.getCall(5).should.be.calledWith('permissions_users');
                knexMock.getCall(6).should.be.calledWith('permissions_roles');
                knexMock.getCall(7).should.be.calledWith('permissions_apps');
                knexMock.getCall(8).should.be.calledWith('settings');
                knexMock.getCall(9).should.be.calledWith('tags');
                knexMock.getCall(10).should.be.calledWith('posts_tags');
                knexMock.getCall(11).should.be.calledWith('apps');
                knexMock.getCall(12).should.be.calledWith('app_settings');
                knexMock.getCall(13).should.be.calledWith('app_fields');

                knexMock.should.not.be.calledWith('clients');
                knexMock.should.not.be.calledWith('client_trusted_domains');
                knexMock.should.not.be.calledWith('refreshtokens');
                knexMock.should.not.be.calledWith('accesstokens');

                done();
            }).catch(done);
        });

        it('should catch and log any errors', function (done) {
            // Setup for failure
            var errorStub = sandbox.stub(errors, 'logAndThrowError');
            queryMock.select.returns(new Promise.reject({}));

            // Execute
            exporter.doExport().then(function (exportData) {
                should.not.exist(exportData);
                errorStub.should.be.calledOnce();
                done();
            }).catch(done);
        });
    });

    describe('exportFileName', function () {
        it('should return a correctly structured filename', function (done) {
            var settingsStub = sandbox.stub(settings, 'read').returns(
                new Promise.resolve({settings: [{value: 'testblog'}]})
            );

            exporter.fileName().then(function (result) {
                should.exist(result);
                settingsStub.should.be.calledOnce();
                result.should.match(/^testblog\.ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}\.json$/);

                done();
            }).catch(done);
        });

        it('should return a correctly structured filename if settings is empty', function (done) {
            var settingsStub = sandbox.stub(settings, 'read').returns(
                new Promise.resolve()
            );

            exporter.fileName().then(function (result) {
                should.exist(result);
                settingsStub.should.be.calledOnce();
                result.should.match(/^ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}\.json$/);

                done();
            }).catch(done);
        });

        it('should return a correctly structured filename if settings errors', function (done) {
            var settingsStub = sandbox.stub(settings, 'read').returns(
                new Promise.reject()
            );

            exporter.fileName().then(function (result) {
                should.exist(result);
                settingsStub.should.be.calledOnce();
                result.should.match(/^ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}\.json$/);

                done();
            }).catch(done);
        });
    });
});
