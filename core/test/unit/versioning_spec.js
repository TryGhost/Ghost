/*globals describe, it, afterEach, beforeEach */
var should  = require('should'),
    sinon   = require('sinon'),
    Promise = require('bluebird'),

    // Stuff we are testing
    versioning = require('../../server/data/schema').versioning,
    db         = require('../../server/data/db'),
    errors     = require('../../server/errors'),

    sandbox    = sinon.sandbox.create();

require('should-sinon');

describe('Versioning', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('getMigrationVersions', function () {
        it('should output a single item if the from and to versions are the same', function () {
            should.exist(versioning.getMigrationVersions);
            versioning.getMigrationVersions('003', '003').should.eql(['003']);
            versioning.getMigrationVersions('004', '004').should.eql(['004']);
        });

        it('should output an empty array if the toVersion is higher than the fromVersion', function () {
            versioning.getMigrationVersions('003', '002').should.eql([]);
        });

        it('should output all the versions between two versions', function () {
            versioning.getMigrationVersions('003', '004').should.eql(['003', '004']);
            versioning.getMigrationVersions('003', '005').should.eql(['003', '004', '005']);
            versioning.getMigrationVersions('003', '006').should.eql(['003', '004', '005', '006']);
            versioning.getMigrationVersions('010', '011').should.eql(['010', '011']);
        });
    });

    describe('getDefaultDatabaseVersion', function () {
        it('should return the correct version', function () {
            var currentVersion = require('../../server/data/schema').defaultSettings.core.databaseVersion.defaultValue;
            // This function has an internal cache, so we call it twice.
            // First, to check that it fetches the correct version from default-settings.json.
            versioning.getDefaultDatabaseVersion().should.eql(currentVersion);
            // Second, to check that it returns the same value from the cache.
            versioning.getDefaultDatabaseVersion().should.eql(currentVersion);
        });
    });

    describe('getDatabaseVersion', function () {
        var errorSpy, knexStub, knexMock, queryMock;

        beforeEach(function () {
            errorSpy = sandbox.spy(errors, 'rejectError');

            queryMock = {
                where: sandbox.stub().returnsThis(),
                first: sandbox.stub()
            };

            knexMock = sandbox.stub().returns(queryMock);
            knexMock.schema = {
                hasTable: sandbox.stub()
            };

            // this MUST use sinon, not sandbox, see sinonjs/sinon#781
            knexStub = sinon.stub(db, 'knex', {get: function () { return knexMock; }});
        });

        afterEach(function () {
            knexStub.restore();
        });

        it('should throw error if settings table does not exist', function (done) {
            // Setup
            knexMock.schema.hasTable.returns(new Promise.resolve(false));

            // Execute
            versioning.getDatabaseVersion().then(function () {
                done('Should throw an error if the settings table does not exist');
            }).catch(function (err) {
                should.exist(err);
                err.message.should.eql('Settings table does not exist');
                errorSpy.should.be.calledOnce();

                // This is written without the should-sinon helpers, due to an issue with getters
                knexStub.get.calledOnce.should.be.true();
                // Everything else here is written with should-sinon...
                knexMock.schema.hasTable.should.be.calledOnce();
                knexMock.schema.hasTable.should.be.calledWith('settings');
                queryMock.where.should.not.be.called();
                queryMock.first.should.not.be.called();
                done();
            }).catch(done);
        });

        it('should lookup & return version, if settings table exists', function (done) {
            // Setup
            knexMock.schema.hasTable.returns(new Promise.resolve(true));
            queryMock.first.returns(new Promise.resolve({value: '001'}));

            // Execute
            versioning.getDatabaseVersion().then(function (version) {
                should.exist(version);
                version.should.eql('001');
                errorSpy.should.not.be.called();

                // This is written without the should-sinon helpers, due to an issue with getters
                knexStub.get.calledTwice.should.be.true();
                // Everything else here is written with should-sinon...
                knexMock.schema.hasTable.should.be.calledOnce();
                knexMock.schema.hasTable.should.be.calledWith('settings');
                queryMock.where.should.be.called();
                queryMock.first.should.be.called();

                done();
            }).catch(done);
        });

        it('should throw error if version does not exist', function (done) {
            // Setup
            knexMock.schema.hasTable.returns(new Promise.resolve(true));
            queryMock.first.returns(new Promise.resolve());

            // Execute
            versioning.getDatabaseVersion().then(function () {
                done('Should throw an error if version does not exist');
            }).catch(function (err) {
                should.exist(err);
                err.message.should.eql('Database version is not recognized');
                errorSpy.should.be.calledOnce();

                // This is written without the should-sinon helpers, due to an issue with getters
                knexStub.get.calledTwice.should.be.true();
                // Everything else here is written with should-sinon...
                knexMock.schema.hasTable.should.be.calledOnce();
                knexMock.schema.hasTable.should.be.calledWith('settings');
                queryMock.where.should.be.called();
                queryMock.first.should.be.called();

                done();
            }).catch(done);
        });

        it('should throw error if version is not a number', function (done) {
            // Setup
            knexMock.schema.hasTable.returns(new Promise.resolve(true));
            queryMock.first.returns(new Promise.resolve('Eyjafjallajökull'));

            // Execute
            versioning.getDatabaseVersion().then(function () {
                done('Should throw an error if version is not a number');
            }).catch(function (err) {
                should.exist(err);
                err.message.should.eql('Database version is not recognized');
                errorSpy.should.be.calledOnce();

                // This is written without the should-sinon helpers, due to an issue with getters
                knexStub.get.calledTwice.should.be.true();
                // Everything else here is written with should-sinon...
                knexMock.schema.hasTable.should.be.calledOnce();
                knexMock.schema.hasTable.should.be.calledWith('settings');
                queryMock.where.should.be.called();
                queryMock.first.should.be.called();

                done();
            }).catch(done);
        });
    });

    describe('setDatabaseVersion', function () {
        var knexStub, knexMock, queryMock;

        beforeEach(function () {
            queryMock = {
                where: sandbox.stub().returnsThis(),
                update: sandbox.stub().returns(new Promise.resolve())
            };

            knexMock = sandbox.stub().returns(queryMock);

            // this MUST use sinon, not sandbox, see sinonjs/sinon#781
            knexStub = sinon.stub(db, 'knex', {get: function () { return knexMock; }});
        });

        afterEach(function () {
            knexStub.restore();
        });

        it('should try to update the databaseVersion', function (done) {
            versioning.setDatabaseVersion().then(function () {
                // This is written without the should-sinon helpers, due to an issue with getters
                knexStub.get.calledOnce.should.be.true();
                // Everything else here is written with should-sinon...
                queryMock.where.should.be.called();
                queryMock.update.should.be.called();

                done();
            }).catch(done);
        });
    });

    describe('showCannotMigrateError', function () {
        it('should output a detailed error message', function () {
            var errorStub = sandbox.stub(errors, 'logAndRejectError');
            versioning.showCannotMigrateError();
            errorStub.should.be.calledOnce();
            errorStub.should.be.calledWith(
                'Unable to upgrade from version 0.4.2 or earlier',
                'Please upgrade to 0.7.1 first',
                'See http://support.ghost.org/how-to-upgrade/ for instructions.'
            );
        });
    });
});
